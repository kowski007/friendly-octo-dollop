import {
  claimHandleForUser,
  getPublicHandleProfile,
  getTelegramBotAccount,
  linkTelegramAliasFromBot,
  listMarketplaceListings,
  listNotifications,
  listSuggestedHandles,
  listTransactions,
  logApiUsage,
  normalizeHandle,
  recordTelegramVerificationEvent,
  resolveHandle,
  resolveHandleBySocial,
  upsertTelegramBotUser,
  updateTelegramBotSession,
} from "./adminStore";
import { getPaylinksDashboard } from "./paylinks/db";

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
  type: string;
};

type TelegramContact = {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
  contact?: TelegramContact;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type InlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

type ReplyButton = {
  text: string;
  request_contact?: boolean;
};

type SendMessageOptions = {
  inlineKeyboard?: InlineButton[][];
  replyKeyboard?: ReplyButton[][];
  removeKeyboard?: boolean;
  disablePreview?: boolean;
};

type TelegramContext = {
  chatId: string;
  telegramUserId: string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
};

const NAIRA = "\u20A6";

function botToken() {
  return (process.env.NT_TELEGRAM_BOT_TOKEN || "").trim();
}

function webhookSecret() {
  return (process.env.NT_TELEGRAM_WEBHOOK_SECRET || "").trim();
}

function publicBaseUrl() {
  return (process.env.NT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/+$/, "");
}

function appUrl(pathname: string) {
  const base = publicBaseUrl();
  return base ? `${base}${pathname}` : "";
}

function hasBotToken() {
  return Boolean(botToken());
}

function formatHandle(handle: string) {
  return `${NAIRA}${handle}`;
}

function formatNairaWhole(amount: number) {
  return `${NAIRA}${Math.max(0, amount).toLocaleString("en-NG")}`;
}

function relativeTime(value?: string) {
  if (!value) return "just now";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "recently";
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function authorizeTelegramWebhook(headers: Headers) {
  const secret = webhookSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return headers.get("x-telegram-bot-api-secret-token") === secret;
}

async function callTelegram<T = unknown>(method: string, payload: Record<string, unknown>) {
  const token = botToken();
  if (!token) return null;

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.warn("telegram_bot_api_failed", method, response.status, text);
    return null;
  }

  return (await response.json().catch(() => null)) as T | null;
}

async function sendMessage(
  chatId: string,
  text: string,
  options: SendMessageOptions = {}
) {
  const reply_markup = options.inlineKeyboard
    ? { inline_keyboard: options.inlineKeyboard }
    : options.replyKeyboard
      ? {
          keyboard: options.replyKeyboard,
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      : options.removeKeyboard
        ? { remove_keyboard: true }
        : undefined;

  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: options.disablePreview ?? true,
    reply_markup,
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

function mainMenuKeyboard(claimHandle?: string | null): InlineButton[][] {
  if (!claimHandle) {
    return [
      [
        { text: `Claim ${NAIRA}handle`, callback_data: "claim" },
        { text: "Lookup", callback_data: "lookup" },
      ],
      [{ text: "Send money", callback_data: "send" }],
      [{ text: "Marketplace", callback_data: "market" }],
      [{ text: "Link Telegram", callback_data: "linktg" }],
    ];
  }

  const keyboard: InlineButton[][] = [
    [
      { text: `My ${NAIRA}handle`, callback_data: "me" },
      { text: "Receive money", callback_data: "receive" },
    ],
    [
      { text: "Share my pay link", callback_data: "sharepay" },
      { text: "Send money", callback_data: "send" },
    ],
    [
      { text: "Lookup", callback_data: "lookup" },
      { text: "Recent activity", callback_data: "activity" },
    ],
    [{ text: "Marketplace", callback_data: "market" }],
  ];

  const payUrl = appUrl(`/pay/${claimHandle}`);
  if (payUrl) {
    keyboard.push([{ text: "Open my pay page", url: payUrl }]);
  }

  const settingsUrl = appUrl("/settings#telegram-linking");
  keyboard.push([
    settingsUrl
      ? { text: "Publish to ENS", url: settingsUrl }
      : { text: "Publish to ENS", callback_data: "publishens" },
  ]);

  keyboard.push([{ text: "Link Telegram", callback_data: "linktg" }]);
  return keyboard;
}

function sharePhoneKeyboard(): ReplyButton[][] {
  return [[{ text: "Share my phone number", request_contact: true }]];
}

function looksLikeHandleInput(value: string) {
  return /^[@\u20A6]?[a-z0-9_]{2,32}$/iu.test(value.trim());
}

function contactDisplayPhone(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/^\++/u, "")}`;
}

function parseVerificationText(text: string) {
  const match = text.trim().match(/^verify\s+(nairatag-[a-f0-9]{8})$/iu);
  return match?.[1]?.toLowerCase() ?? null;
}

function parseStartPayload(text: string) {
  const match = text.trim().match(/^\/start(?:@\w+)?\s+(.+)$/iu);
  return match?.[1]?.trim() ?? "";
}

function verificationPayloadCode(payload: string) {
  const match = payload.match(/^verify_[a-z0-9_]{2,20}_(nairatag-[a-f0-9]{8})$/iu);
  return match?.[1]?.toLowerCase() ?? null;
}

function messageContext(message: TelegramMessage): TelegramContext | null {
  if (!message.from) return null;
  return {
    chatId: String(message.chat.id),
    telegramUserId: String(message.from.id),
    telegramUsername: message.from.username,
    firstName: message.from.first_name,
    lastName: message.from.last_name,
  };
}

async function getPrimaryPaylinkUrl(ownerId: string, handle: string) {
  const dashboard = await getPaylinksDashboard(ownerId).catch(() => null);
  const activePaylink =
    dashboard?.paylinks.find((entry) => entry.status === "active") ?? dashboard?.paylinks[0];

  if (activePaylink) {
    return appUrl(`/pay/${handle}/${activePaylink.shortCode}`);
  }

  return "";
}

async function buildAccountLinks(userId: string, handle: string) {
  const payUrl = appUrl(`/pay/${handle}`);
  const profileUrl = appUrl(`/h/${handle}`);
  const paylinkUrl = await getPrimaryPaylinkUrl(userId, handle);
  const settingsUrl = appUrl("/settings#telegram-linking");
  return {
    payUrl,
    profileUrl,
    paylinkUrl,
    settingsUrl,
  };
}

async function sendHome(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  const name = context.firstName?.trim() || "there";
  const summary = account.claim
    ? `You're linked to ₦${account.claim.handle}. Use the buttons below to open your handle, send money, or manage Telegram linking.`
    : "Claim your ₦handle, look up people by handle or Telegram username, and jump into pay pages without leaving the bot.";

  await updateTelegramBotSession({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
    state: "idle",
    pendingHandle: null,
    pendingDisplayName: null,
  });

  await sendMessage(
    context.chatId,
    `Hi ${name}.\n\n${summary}`,
    {
      inlineKeyboard: mainMenuKeyboard(account.claim?.handle),
    }
  );
}

async function sendMarketplacePreview(context: TelegramContext) {
  const listings = await listMarketplaceListings({ limit: 3, statuses: ["active"] });
  if (!listings.items.length) {
    await sendMessage(context.chatId, "No live marketplace listings yet.", {
      inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]],
    });
    return;
  }

  const lines = listings.items.map((listing, index) => {
    const price =
      typeof listing.listing.askAmount === "number"
        ? `₦${listing.listing.askAmount.toLocaleString("en-NG")}`
        : "Offers only";
    return `${index + 1}. ₦${listing.listing.handle} • ${price}`;
  });

  const buttons: InlineButton[][] = listings.items
    .map((listing) => {
      const url = appUrl(`/marketplace/${listing.listing.handle}`);
      return url ? [{ text: `Open ₦${listing.listing.handle}`, url }] : [];
    })
    .filter((row) => row.length > 0);

  const marketplaceUrl = appUrl("/marketplace");
  if (marketplaceUrl) {
    buttons.push([{ text: "Open marketplace", url: marketplaceUrl }]);
  }
  buttons.push([{ text: "Back to menu", callback_data: "home" }]);

  await sendMessage(
    context.chatId,
    `Live marketplace now\n\n${lines.join("\n")}`,
    {
      inlineKeyboard: buttons,
    }
  );
}

async function sendMyHandle(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (!account.user) {
    await updateTelegramBotSession({
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
      telegramUsername: context.telegramUsername,
      telegramFirstName: context.firstName,
      telegramLastName: context.lastName,
      state: "connect_phone",
    });
    await sendMessage(
      context.chatId,
      "I need your phone number once so I can connect this Telegram chat to your NairaTag account.",
      { replyKeyboard: sharePhoneKeyboard() }
    );
    return;
  }

  if (!account.claim) {
    await sendMessage(
      context.chatId,
      "Your account is connected, but you have not claimed a ₦handle yet.",
      {
        inlineKeyboard: [
          [{ text: "Claim ₦handle", callback_data: "claim" }],
          [{ text: "Back to menu", callback_data: "home" }],
        ],
      }
    );
    return;
  }

  const profile = await getPublicHandleProfile(account.claim.handle);
  const { payUrl, profileUrl, paylinkUrl, settingsUrl } = await buildAccountLinks(
    account.user.id,
    account.claim.handle
  );
  const lines = [
    `₦${account.claim.handle}`,
    profile?.displayName || account.claim.displayName,
    `Verification: ${account.claim.verification}`,
    `Trust: ${profile?.reputation.trustScore ?? 0}/100`,
    paylinkUrl ? "Saved pay link ready to share." : "Direct pay page ready now.",
  ];

  const buttons: InlineButton[][] = [];
  if (paylinkUrl || payUrl) {
    buttons.push(
      [
        paylinkUrl ? { text: "Share pay link", callback_data: "sharepay" } : null,
        payUrl ? { text: "Open pay page", url: payUrl } : null,
      ].filter(Boolean) as InlineButton[]
    );
  }
  if (profileUrl || settingsUrl) {
    buttons.push(
      [
        profileUrl ? { text: "Public profile", url: profileUrl } : null,
        settingsUrl ? { text: "Publish to ENS", url: settingsUrl } : null,
      ].filter(Boolean) as InlineButton[]
    );
  }
  buttons.push(
    [
      { text: "Receive money", callback_data: "receive" },
      { text: "Recent activity", callback_data: "activity" },
    ],
    [{ text: "Link Telegram", callback_data: "linktg" }]
  );
  buttons.push([{ text: "Back to menu", callback_data: "home" }]);

  await sendMessage(context.chatId, lines.join("\n"), { inlineKeyboard: buttons });
}

async function sendReceiveMoney(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (!account.user) {
    await updateTelegramBotSession({
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
      telegramUsername: context.telegramUsername,
      telegramFirstName: context.firstName,
      telegramLastName: context.lastName,
      state: "connect_phone",
    });
    await sendMessage(
      context.chatId,
      "Share your phone number once so I can connect this chat to your NairaTag account first.",
      { replyKeyboard: sharePhoneKeyboard() }
    );
    return;
  }

  if (!account.claim) {
    await sendMessage(
      context.chatId,
      `Claim a ${NAIRA}handle first, then I can open your receive surfaces here.`,
      {
        inlineKeyboard: [
          [{ text: `Claim ${NAIRA}handle`, callback_data: "claim" }],
          [{ text: "Back to menu", callback_data: "home" }],
        ],
      }
    );
    return;
  }

  const { payUrl, profileUrl, paylinkUrl, settingsUrl } = await buildAccountLinks(
    account.user.id,
    account.claim.handle
  );
  const builderUrl = appUrl("/payments/payment-links/builder");
  const lines = [
    `Receive with ${formatHandle(account.claim.handle)}`,
    paylinkUrl
      ? "Your saved pay link is ready for hosted checkout."
      : "Your direct pay page is live. Create a saved pay link anytime for richer checkout.",
    paylinkUrl ? `Saved pay link: ${paylinkUrl}` : null,
    payUrl ? `Direct pay page: ${payUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const buttons: InlineButton[][] = [];
  if (paylinkUrl || payUrl) {
    buttons.push(
      [
        paylinkUrl ? { text: "Share pay link", callback_data: "sharepay" } : null,
        payUrl ? { text: "Open pay page", url: payUrl } : null,
      ].filter(Boolean) as InlineButton[]
    );
  }
  if (builderUrl && !paylinkUrl) {
    buttons.push([{ text: "Create saved pay link", url: builderUrl }]);
  }
  if (profileUrl || settingsUrl) {
    buttons.push(
      [
        profileUrl ? { text: "Public profile", url: profileUrl } : null,
        settingsUrl ? { text: "Publish to ENS", url: settingsUrl } : null,
      ].filter(Boolean) as InlineButton[]
    );
  }
  buttons.push([{ text: "Back to menu", callback_data: "home" }]);

  await sendMessage(context.chatId, lines, {
    inlineKeyboard: buttons,
    disablePreview: false,
  });
}

async function sendSharePayLink(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (!account.claim || !account.user) {
    await sendMessage(
      context.chatId,
      `Claim your ${NAIRA}handle first, then I can give you a shareable payment link.`,
      {
        inlineKeyboard: [
          [{ text: `Claim ${NAIRA}handle`, callback_data: "claim" }],
          [{ text: "Back to menu", callback_data: "home" }],
        ],
      }
    );
    return;
  }

  const { payUrl, paylinkUrl } = await buildAccountLinks(account.user.id, account.claim.handle);
  const shareUrl = paylinkUrl || payUrl;
  const buttons: InlineButton[][] = [];
  if (shareUrl) {
    buttons.push([{ text: "Open link", url: shareUrl }]);
  }
  if (payUrl && payUrl !== shareUrl) {
    buttons.push([{ text: "Open pay page", url: payUrl }]);
  }
  buttons.push(
    [{ text: "Receive money", callback_data: "receive" }],
    [{ text: "Back to menu", callback_data: "home" }]
  );

  await sendMessage(
    context.chatId,
    shareUrl
      ? `Share this NairaTag payment link for ${formatHandle(account.claim.handle)}:\n\n${shareUrl}`
      : `I could not find a public pay surface for ${formatHandle(account.claim.handle)} yet.`,
    {
      inlineKeyboard: buttons,
      disablePreview: false,
    }
  );
}

async function sendPublishEns(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (!account.claim || !account.user) {
    await sendMessage(
      context.chatId,
      `Claim your ${NAIRA}handle first, then I can route you into the ENS publish flow.`,
      {
        inlineKeyboard: [
          [{ text: `Claim ${NAIRA}handle`, callback_data: "claim" }],
          [{ text: "Back to menu", callback_data: "home" }],
        ],
      }
    );
    return;
  }

  const settingsUrl = appUrl("/settings#telegram-linking");
  const username = context.telegramUsername || account.user.telegramUsername;
  const lines = [
    `Publish Telegram to ENS for ${formatHandle(account.claim.handle)}`,
    username
      ? `Telegram on file: @${username.replace(/^@/u, "")}`
      : "Set a public Telegram username first so ENS has something to publish.",
    `The final step happens on the web app because your wallet must sign the real ENS text record update for ${account.claim.handle}.nairatag.eth.`,
  ];

  const buttons: InlineButton[][] = [];
  if (!account.user.telegramLinkedAt) {
    buttons.push([{ text: "Link Telegram", callback_data: "linktg" }]);
  }
  if (settingsUrl) {
    buttons.push([{ text: "Open ENS publish flow", url: settingsUrl }]);
  }
  buttons.push([{ text: "Back to menu", callback_data: "home" }]);

  await sendMessage(context.chatId, lines.join("\n\n"), {
    inlineKeyboard: buttons,
    disablePreview: false,
  });
}

async function sendRecentActivity(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (!account.claim || !account.user) {
    await sendMessage(
      context.chatId,
      `Claim your ${NAIRA}handle first, then I can show recent payments and updates here.`,
      {
        inlineKeyboard: [
          [{ text: `Claim ${NAIRA}handle`, callback_data: "claim" }],
          [{ text: "Back to menu", callback_data: "home" }],
        ],
      }
    );
    return;
  }

  const [transactionsResult, notificationsResult] = await Promise.all([
    listTransactions({ userId: account.user.id, limit: 4 }),
    listNotifications({ userId: account.user.id, limit: 4 }),
  ]);

  const transactions = [...transactionsResult.items]
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )
    .slice(0, 3);
  const notifications = [...notificationsResult.items]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);
  const dashboardUrl = appUrl("/dashboard");

  const paymentLines = transactions.length
    ? transactions.map(
        (entry) =>
          `• ${entry.status} ${formatNairaWhole(entry.amount)} via ${entry.channel.replace(/_/g, " ")} · ${relativeTime(entry.recordedAt)}`
      )
    : ["• No payment activity yet."];
  const notificationLines = notifications.length
    ? notifications.map(
        (entry) => `• ${entry.title} · ${relativeTime(entry.createdAt)}`
      )
    : ["• No inbox updates yet."];

  await sendMessage(
    context.chatId,
    [
      `Recent activity for ${formatHandle(account.claim.handle)}`,
      "",
      "Payments",
      ...paymentLines,
      "",
      "Updates",
      ...notificationLines,
    ].join("\n"),
    {
      inlineKeyboard: dashboardUrl
        ? [
            [{ text: "Open dashboard", url: dashboardUrl }],
            [{ text: "Back to menu", callback_data: "home" }],
          ]
        : [[{ text: "Back to menu", callback_data: "home" }]],
      disablePreview: false,
    }
  );
}

async function startClaim(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (account.claim) {
    await sendMessage(
      context.chatId,
      `You already own ₦${account.claim.handle}. NairaTag is currently one handle per account.`,
      {
        inlineKeyboard: [
          [{ text: "My ₦handle", callback_data: "me" }],
          [{ text: "Back to menu", callback_data: "home" }],
        ],
      }
    );
    return;
  }

  await updateTelegramBotSession({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
    state: "claim_handle",
    pendingHandle: null,
  });

  await sendMessage(
    context.chatId,
    "Send the handle you want next. Example: victor or ₦victor",
    {
      removeKeyboard: true,
      inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]],
    }
  );
}

async function startLookup(context: TelegramContext, mode: "lookup_handle" | "send_handle") {
  await updateTelegramBotSession({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
    state: mode,
  });

  await sendMessage(
    context.chatId,
    mode === "send_handle"
      ? "Send the ₦handle or @telegram username you want to pay."
      : "Send the ₦handle or @telegram username you want to look up.",
    {
      removeKeyboard: true,
      inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]],
    }
  );
}

async function sendLookupResult(context: TelegramContext, rawInput: string, payMode: boolean) {
  const input = rawInput.trim();

  if (!looksLikeHandleInput(input)) {
    await sendMessage(
      context.chatId,
      "Send a clean ₦handle like ₦victor or a Telegram username like @victor7593.",
      {
        inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]],
      }
    );
    return;
  }

  const socialResult =
    input.startsWith("@") || input.toLowerCase().startsWith("t.me/")
      ? await resolveHandleBySocial({ platform: "telegram", username: input })
      : null;

  const handleToCheck = socialResult?.handle ?? normalizeHandle(input);
  const resolved = await resolveHandle(handleToCheck);

  if (resolved.status !== "claimed") {
    await sendMessage(
      context.chatId,
      socialResult
        ? `I could not find a live NairaTag route for ${input} yet.`
        : `₦${handleToCheck} is not claimed yet.`,
      {
        inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]],
      }
    );
    return;
  }

  const profile = await getPublicHandleProfile(resolved.handle);
  const payUrl = appUrl(`/pay/${resolved.handle}`);
  const profileUrl = appUrl(`/h/${resolved.handle}`);
  const buttons: InlineButton[][] = [];

  const primaryRow: InlineButton[] = [];
  if (payMode && payUrl) primaryRow.push({ text: `Pay ₦${resolved.handle}`, url: payUrl });
  if (profileUrl) primaryRow.push({ text: "Profile", url: profileUrl });
  if (!payMode && payUrl) primaryRow.push({ text: "Pay page", url: payUrl });
  if (primaryRow.length) buttons.push(primaryRow);
  buttons.push([{ text: "Back to menu", callback_data: "home" }]);

  await sendMessage(
    context.chatId,
    [
      socialResult ? `${input} resolves to ₦${resolved.handle}` : `₦${resolved.handle}`,
      profile?.displayName || resolved.displayName,
      `Verification: ${resolved.verification}`,
      `Trust: ${profile?.reputation.trustScore ?? 0}/100`,
      profile?.socials.find((entry) => entry.platform === "telegram")?.username
        ? `Telegram: ${profile.socials.find((entry) => entry.platform === "telegram")?.username}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
    { inlineKeyboard: buttons }
  );
}

async function handleClaimHandleInput(
  context: TelegramContext,
  rawInput: string
) {
  const input = normalizeHandle(rawInput);
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (account.claim) {
    await sendMessage(
      context.chatId,
      `You already own ₦${account.claim.handle}.`,
      { inlineKeyboard: [[{ text: "My ₦handle", callback_data: "me" }]] }
    );
    await updateTelegramBotSession({
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
      state: "idle",
      pendingHandle: null,
    });
    return;
  }

  const resolved = await resolveHandle(input);
  if (resolved.status === "invalid") {
    await sendMessage(
      context.chatId,
      "That handle format is invalid. Use letters, numbers, or underscore only.",
      { inlineKeyboard: [[{ text: "Try again", callback_data: "claim" }]] }
    );
    return;
  }

  if (resolved.status === "claimed") {
    const suggestions = await listSuggestedHandles({ seed: input, limit: 3 });
    const suggestionText = suggestions.length
      ? `\n\nTry instead:\n${suggestions.map((entry) => `• ₦${entry.handle}`).join("\n")}`
      : "";
    await sendMessage(
      context.chatId,
      `₦${resolved.handle} is already claimed.${suggestionText}`,
      { inlineKeyboard: [[{ text: "Try another", callback_data: "claim" }]] }
    );
    return;
  }

  if (account.user?.phoneVerifiedAt) {
    const claim = await claimHandleForUser({
      userId: account.user.id,
      handle: input,
      source: "telegram",
    });
    let telegramLinked = false;
    if (context.telegramUsername) {
      try {
        await linkTelegramAliasFromBot({
          userId: account.user.id,
          handle: input,
          telegramUsername: context.telegramUsername,
          telegramUserId: context.telegramUserId,
          telegramChatId: context.chatId,
        });
        telegramLinked = true;
      } catch {
        telegramLinked = false;
      }
    }

    await updateTelegramBotSession({
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
      state: "idle",
      pendingHandle: null,
    });
    await sendClaimSuccess(context, claim.handle, telegramLinked);
    return;
  }

  await updateTelegramBotSession({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
    state: "claim_phone",
    pendingHandle: input,
  });

  await sendMessage(
    context.chatId,
    `₦${input} is available. Share the phone number tied to your NairaTag account so I can finish the claim here.`,
    { replyKeyboard: sharePhoneKeyboard() }
  );
}

async function sendClaimSuccess(
  context: TelegramContext,
  handle: string,
  telegramLinked: boolean
) {
  const payUrl = appUrl(`/pay/${handle}`);
  const profileUrl = appUrl(`/h/${handle}`);
  const settingsUrl = appUrl("/settings#telegram-linking");
  const buttons: InlineButton[][] = [];

  if (payUrl || profileUrl) {
    buttons.push(
      [
        payUrl ? { text: "Open pay page", url: payUrl } : null,
        profileUrl ? { text: "Public profile", url: profileUrl } : null,
      ].filter(Boolean) as InlineButton[]
    );
  }
  buttons.push(
    [
      { text: "Receive money", callback_data: "receive" },
      { text: "Share pay link", callback_data: "sharepay" },
    ].filter(Boolean) as InlineButton[]
  );
  if (settingsUrl) {
    buttons.push([{ text: "Publish Telegram to ENS", url: settingsUrl }]);
  }
  buttons.push([{ text: "Main menu", callback_data: "home" }]);

  await sendMessage(
    context.chatId,
    telegramLinked
      ? `Claimed successfully.\n\n₦${handle} is live, and your Telegram identity is already linked. Publish it to ENS next when you're ready.`
      : `Claimed successfully.\n\n₦${handle} is live on NairaTag.`,
    {
      removeKeyboard: true,
      inlineKeyboard: buttons,
    }
  );
}

async function handleContactMessage(context: TelegramContext, contact: TelegramContact) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (!account.session) {
    await sendHome(context);
    return;
  }

  if (contact.user_id && String(contact.user_id) !== context.telegramUserId) {
    await sendMessage(
      context.chatId,
      "Please share your own phone number from Telegram, not someone else's contact.",
      { replyKeyboard: sharePhoneKeyboard() }
    );
    return;
  }

  const user = await upsertTelegramBotUser({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    firstName: context.firstName,
    lastName: context.lastName,
    phone: contactDisplayPhone(contact.phone_number),
  });

  if (account.session.state === "connect_phone") {
    await updateTelegramBotSession({
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
      state: "idle",
      pendingHandle: null,
      pendingDisplayName: null,
    });

    const refreshed = await getTelegramBotAccount({
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
      telegramUsername: context.telegramUsername,
      telegramFirstName: context.firstName,
      telegramLastName: context.lastName,
    });

    if (refreshed.claim) {
      await sendMessage(
        context.chatId,
        `Connected successfully. Your account owns ₦${refreshed.claim.handle}.`,
        {
          removeKeyboard: true,
          inlineKeyboard: [
            [{ text: "My ₦handle", callback_data: "me" }],
            [{ text: "Main menu", callback_data: "home" }],
          ],
        }
      );
      return;
    }

    await sendMessage(
      context.chatId,
      "Your phone is connected. You can claim a ₦handle here next.",
      {
        removeKeyboard: true,
        inlineKeyboard: [
          [{ text: "Claim ₦handle", callback_data: "claim" }],
          [{ text: "Main menu", callback_data: "home" }],
        ],
      }
    );
    return;
  }

  if (account.session.state !== "claim_phone" || !account.session.pendingHandle) {
    await sendMessage(
      context.chatId,
      "Your phone is connected. Use the menu below for your next action.",
      {
        removeKeyboard: true,
        inlineKeyboard: mainMenuKeyboard((await getTelegramBotAccount({
          telegramUserId: context.telegramUserId,
          telegramChatId: context.chatId,
          telegramUsername: context.telegramUsername,
          telegramFirstName: context.firstName,
          telegramLastName: context.lastName,
        })).claim?.handle),
      }
    );
    return;
  }

  const handle = account.session.pendingHandle;
  const claim = await claimHandleForUser({
    userId: user.id,
    handle,
    source: "telegram",
  });

  let telegramLinked = false;
  if (context.telegramUsername) {
    try {
      await linkTelegramAliasFromBot({
        userId: user.id,
        handle,
        telegramUsername: context.telegramUsername,
        telegramUserId: context.telegramUserId,
        telegramChatId: context.chatId,
      });
      telegramLinked = true;
    } catch {
      telegramLinked = false;
    }
  }

  await updateTelegramBotSession({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    state: "idle",
    pendingHandle: null,
    pendingDisplayName: null,
  });
  await sendClaimSuccess(context, claim.handle, telegramLinked);
}

async function handleLinkTelegram(context: TelegramContext) {
  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (!account.user) {
    await updateTelegramBotSession({
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
      telegramUsername: context.telegramUsername,
      telegramFirstName: context.firstName,
      telegramLastName: context.lastName,
      state: "connect_phone",
    });
    await sendMessage(
      context.chatId,
      "Share your phone number once so I can connect this Telegram chat to your NairaTag account.",
      { replyKeyboard: sharePhoneKeyboard() }
    );
    return;
  }

  if (!account.claim) {
    await sendMessage(
      context.chatId,
      "Claim a ₦handle first, then I can bind this Telegram username to it.",
      { inlineKeyboard: [[{ text: "Claim ₦handle", callback_data: "claim" }]] }
    );
    return;
  }

  if (!context.telegramUsername) {
    await sendMessage(
      context.chatId,
      "Set a public Telegram username first, then tap Link Telegram again.",
      { inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]] }
    );
    return;
  }

  try {
    await linkTelegramAliasFromBot({
      userId: account.user.id,
      handle: account.claim.handle,
      telegramUsername: context.telegramUsername,
      telegramUserId: context.telegramUserId,
      telegramChatId: context.chatId,
    });
  } catch (error) {
    await sendMessage(
      context.chatId,
      error instanceof Error && error.message === "telegram_username_claimed"
        ? "That Telegram username is already linked to another NairaTag handle."
        : "I could not link this Telegram username right now.",
      { inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]] }
    );
    return;
  }

  const settingsUrl = appUrl("/settings#telegram-linking");
  await sendMessage(
    context.chatId,
    `Linked ${context.telegramUsername} to ₦${account.claim.handle}. The last step is publishing it to ENS from your wallet.`,
    {
      inlineKeyboard: [
        settingsUrl ? [{ text: "Publish to ENS", url: settingsUrl }] : [],
        [{ text: "My ₦handle", callback_data: "me" }],
        [{ text: "Main menu", callback_data: "home" }],
      ].filter((row) => row.length > 0),
    }
  );
}

async function handleVerificationFromBot(context: TelegramContext, code: string) {
  if (!context.telegramUsername) {
    await sendMessage(
      context.chatId,
      "Set a public Telegram username first, then send the verification message again.",
      { inlineKeyboard: [[{ text: "Back to menu", callback_data: "home" }]] }
    );
    return;
  }

  await recordTelegramVerificationEvent({
    username: context.telegramUsername,
    code,
    messageText: `verify ${code}`,
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
  });

  await sendMessage(
    context.chatId,
    "Verification recorded. Return to NairaTag and the linking page will detect it automatically.",
    { inlineKeyboard: [[{ text: "Main menu", callback_data: "home" }]] }
  );
}

async function handleStartPayload(context: TelegramContext, payload: string) {
  const code = verificationPayloadCode(payload);
  if (!code) {
    await sendHome(context);
    return;
  }
  await handleVerificationFromBot(context, code);
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  if (!chatId) return;

  const context: TelegramContext = {
    chatId: String(chatId),
    telegramUserId: String(callbackQuery.from.id),
    telegramUsername: callbackQuery.from.username,
    firstName: callbackQuery.from.first_name,
    lastName: callbackQuery.from.last_name,
  };

  const data = callbackQuery.data || "home";
  if (data === "home") {
    await sendHome(context);
    return;
  }
  if (data === "claim") {
    await startClaim(context);
    return;
  }
  if (data === "me") {
    await sendMyHandle(context);
    return;
  }
  if (data === "lookup") {
    await startLookup(context, "lookup_handle");
    return;
  }
  if (data === "send") {
    await startLookup(context, "send_handle");
    return;
  }
  if (data === "receive") {
    await sendReceiveMoney(context);
    return;
  }
  if (data === "sharepay") {
    await sendSharePayLink(context);
    return;
  }
  if (data === "market") {
    await sendMarketplacePreview(context);
    return;
  }
  if (data === "activity") {
    await sendRecentActivity(context);
    return;
  }
  if (data === "publishens") {
    await sendPublishEns(context);
    return;
  }
  if (data === "linktg") {
    await handleLinkTelegram(context);
    return;
  }

  await sendHome(context);
}

async function handleTextMessage(message: TelegramMessage, context: TelegramContext) {
  const text = message.text?.trim() || "";
  if (!text) return;

  const verificationCode = parseVerificationText(text);
  if (verificationCode) {
    await handleVerificationFromBot(context, verificationCode);
    return;
  }

  if (/^\/start/iu.test(text)) {
    const payload = parseStartPayload(text);
    if (payload) {
      await handleStartPayload(context, payload);
      return;
    }
    await sendHome(context);
    return;
  }

  if (/^\/claim/iu.test(text)) {
    await startClaim(context);
    return;
  }
  if (/^\/me/iu.test(text)) {
    await sendMyHandle(context);
    return;
  }
  if (/^\/market/u.test(text)) {
    await sendMarketplacePreview(context);
    return;
  }
  if (/^\/lookup/iu.test(text)) {
    await startLookup(context, "lookup_handle");
    return;
  }
  if (/^\/send/iu.test(text)) {
    await startLookup(context, "send_handle");
    return;
  }
  if (/^\/receive/iu.test(text)) {
    await sendReceiveMoney(context);
    return;
  }
  if (/^\/activity/iu.test(text)) {
    await sendRecentActivity(context);
    return;
  }
  if (/^\/(paylink|sharepay)/iu.test(text)) {
    await sendSharePayLink(context);
    return;
  }
  if (/^\/ens/iu.test(text)) {
    await sendPublishEns(context);
    return;
  }

  const account = await getTelegramBotAccount({
    telegramUserId: context.telegramUserId,
    telegramChatId: context.chatId,
    telegramUsername: context.telegramUsername,
    telegramFirstName: context.firstName,
    telegramLastName: context.lastName,
  });

  if (account.session.state === "claim_handle") {
    await handleClaimHandleInput(context, text);
    return;
  }
  if (account.session.state === "lookup_handle") {
    await sendLookupResult(context, text, false);
    return;
  }
  if (account.session.state === "send_handle") {
    await sendLookupResult(context, text, true);
    return;
  }

  if (looksLikeHandleInput(text)) {
    await sendLookupResult(context, text, false);
    return;
  }

  await sendHome(context);
}

export async function handleTelegramBotUpdate(update: TelegramUpdate) {
  if (!hasBotToken()) return { ok: true, skipped: "missing_token" as const };

  try {
    if (update.callback_query) {
      await answerCallbackQuery(update.callback_query.id);
      await handleCallbackQuery(update.callback_query);
      return { ok: true };
    }

    if (!update.message) return { ok: true };
    if (update.message.chat.type !== "private") {
      return { ok: true, skipped: "non_private_chat" as const };
    }

    const context = messageContext(update.message);
    if (!context) return { ok: true, skipped: "missing_sender" as const };

    if (update.message.contact) {
      await handleContactMessage(context, update.message.contact);
      return { ok: true };
    }

    await handleTextMessage(update.message, context);
    return { ok: true };
  } catch (error) {
    console.warn(
      "telegram_bot_update_failed",
      error instanceof Error ? error.message : String(error)
    );
    return { ok: false, error: error instanceof Error ? error.message : "unknown_error" };
  }
}

export async function logTelegramBotWebhook(status: number, latencyMs: number) {
  await logApiUsage({
    endpoint: "/api/telegram/bot",
    method: "POST",
    status,
    latencyMs,
  });
}
