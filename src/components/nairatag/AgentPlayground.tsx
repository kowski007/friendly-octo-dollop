"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FormEvent,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  PrivySessionButton,
  type PrivySessionUser,
} from "@/components/auth/PrivySessionButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge, CheckIcon, NairaTermBadge, cn } from "./ui";

type MessageRole = "assistant" | "user";
type AgentStep =
  | "await_handle"
  | "await_phone"
  | "await_otp"
  | "await_bvn"
  | "done";
type Verification = "pending" | "verified" | "business";

type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
};

type ResolveResponse =
  | {
      status: "claimed";
      handle: string;
      displayName: string;
      bank: string;
      verification: Verification;
    }
  | {
      status: "available";
      handle: string;
    }
  | {
      status: "invalid";
      reason: string;
    };

type ClaimResponse = {
  ok: true;
  claim: {
    id: string;
    handle: string;
    verification: Verification;
  };
};

type LinkBvnResponse = {
  ok: true;
  user: {
    fullName?: string;
  };
  claim: {
    handle: string;
    verification: Verification;
    displayName?: string;
  } | null;
};

const NAIRA = "\u20A6";

type ErrorResponse = {
  error?: string;
};

type ActionTone = "violet" | "sky" | "mint" | "amber";

type ActionCard = {
  eyebrow: string;
  title: string;
  description: string;
  value?: string;
  tone: ActionTone;
};

function createId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readPendingPrompt() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem("nairatag_agent_prefill") ?? "";
}

function makeMessage(role: MessageRole, text: string): ChatMessage {
  return { id: createId(), role, text };
}

function normalizeHandle(input: string) {
  return input.trim().replace(/^\u20A6/u, "").replace(/^@/u, "").toLowerCase();
}

function extractHandle(input: string) {
  const direct = /[\u20A6@]([a-z0-9_]{2,20})/iu.exec(input)?.[1];
  if (direct) return direct;

  const tokens = input
    .trim()
    .split(/\s+/g)
    .map((token) => token.replace(/[^\w\u20A6@]/gu, ""))
    .filter(Boolean);

  for (const token of tokens) {
    const match = /^(?:[\u20A6@])?([a-z0-9_]{2,20})$/iu.exec(token);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractPhone(input: string) {
  const match = /(\+?\d[\d\s\-()]{6,24}\d)/u.exec(input);
  return match?.[1]?.replace(/[^\d+]/gu, "") ?? null;
}

function extractOtp(input: string) {
  return /\b(\d{6})\b/u.exec(input)?.[1] ?? null;
}

function stripLeadingSeparators(value: string) {
  let next = value.trim();

  while (
    next.startsWith("-") ||
    next.startsWith(":") ||
    next.startsWith(",")
  ) {
    next = next.slice(1).trimStart();
  }

  return next.trim();
}

function extractBvnAndName(input: string) {
  const match = /\b(\d{11})\b/u.exec(input);
  if (!match?.[1]) return null;

  const bvn = match[1];
  const fullName = stripLeadingSeparators(input.replace(match[0], ""));
  return {
    bvn,
    fullName: fullName || undefined,
  };
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function isResolveResponse(value: unknown): value is ResolveResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "status" in value &&
      typeof (value as { status?: unknown }).status === "string"
  );
}

function humanizeStep(step: AgentStep) {
  switch (step) {
    case "await_handle":
      return "Awaiting handle";
    case "await_phone":
      return "Collecting phone";
    case "await_otp":
      return "Verifying OTP";
    case "await_bvn":
      return "Optional BVN";
    case "done":
      return "Completed";
    default:
      return step;
  }
}

function RailIcon({
  kind,
  active = false,
}: {
  kind: "home" | "chat" | "spark" | "history" | "shield" | "user" | "compose";
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid h-9 w-9 place-items-center rounded-[18px] border transition",
        active
          ? "border-zinc-900 bg-zinc-950 text-white shadow-[0_12px_24px_rgba(24,24,27,0.14)] dark:border-white dark:bg-white dark:text-zinc-950"
          : "border-zinc-200/80 bg-white/75 text-zinc-500 hover:bg-white dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-400 dark:hover:bg-zinc-900"
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        {kind === "home" ? (
          <path
            d="M4 11.5L12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-7.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        ) : kind === "chat" ? (
          <>
            <rect x="4" y="5" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M9 16l-3 3v-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : kind === "spark" ? (
          <path
            d="M12 3l1.6 5.3L19 10l-5.4 1.7L12 17l-1.6-5.3L5 10l5.4-1.7L12 3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        ) : kind === "compose" ? (
          <>
            <path
              d="M5 18.5l3.6-.8L18 8.3 15.7 6 6.3 15.4 5 18.5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M14.8 6.8l2.4 2.4M9 19h10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : kind === "history" ? (
          <>
            <path
              d="M5 12a7 7 0 1 0 2-4.9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M5 5v3.5h3.5M12 8.5v4l2.5 1.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : kind === "shield" ? (
          <>
            <path
              d="M12 4l6 2.8v4.8c0 4-2.4 7.3-6 8.4-3.6-1.1-6-4.4-6-8.4V6.8L12 4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M9.2 12l1.8 1.8 3.8-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M6.5 19a5.5 5.5 0 0 1 11 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}

function SamplePrompt({
  text,
  onClick,
}: {
  text: string;
  onClick: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="rounded-full border border-zinc-200/80 bg-white/78 px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-white dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {text}
    </button>
  );
}

function ActionButtonCard({
  action,
  onClick,
}: {
  action: ActionCard;
  onClick: (value?: string) => void;
}) {
  const toneClasses =
    action.tone === "violet"
      ? "from-violet-100 via-white to-sky-100 dark:from-violet-950/80 dark:via-zinc-950 dark:to-sky-950/70"
      : action.tone === "sky"
        ? "from-sky-100 via-white to-cyan-100 dark:from-sky-950/80 dark:via-zinc-950 dark:to-cyan-950/70"
        : action.tone === "mint"
          ? "from-emerald-100 via-white to-teal-100 dark:from-emerald-950/80 dark:via-zinc-950 dark:to-teal-950/70"
          : "from-orange-100 via-white to-amber-100 dark:from-orange-950/80 dark:via-zinc-950 dark:to-amber-950/70";

  const iconBg =
    action.tone === "violet"
      ? "bg-violet-500"
      : action.tone === "sky"
        ? "bg-sky-500"
        : action.tone === "mint"
          ? "bg-emerald-500"
          : "bg-orange-500";

  return (
    <button
      type="button"
      onClick={() => onClick(action.value)}
      className={cn(
        "group relative overflow-hidden rounded-[18px] border border-white/85 bg-gradient-to-br px-3 py-2.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.07)] dark:border-zinc-800/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.28)]",
        toneClasses
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_58%)]" />
      <div className="relative flex items-center gap-3">
        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white", iconBg)}>
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
              {action.eyebrow}
            </div>
            <div className="h-1 w-1 rounded-full bg-zinc-300" />
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Use
            </div>
          </div>
          <div className="mt-1 truncate text-sm font-semibold leading-5 text-zinc-950 dark:text-zinc-50">
            {action.title}
          </div>
          <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-zinc-600 dark:text-zinc-300">
            {action.description}
          </div>
        </div>

        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/85 bg-white/80 text-zinc-500 shadow-sm transition group-hover:bg-white group-hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-50">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path
              d="M8 12h8M12 8l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}

export function AgentPlayground() {
  const pathname = usePathname();
  const claimRootPath = "/claim";
  const claimHistoryPath = "/claim/history";
  const claimRootActive = pathname === "/claim";
  const claimHistoryActive = pathname === "/claim/history";
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage(
      "assistant",
      `Let's claim a NairaTag handle.\n\nSend a handle like ${NAIRA}victor, then I'll guide you through phone OTP, claim, and optional BVN verification.`
    ),
  ]);
  const [input, setInput] = useState(readPendingPrompt);
  const [step, setStep] = useState<AgentStep>("await_handle");
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const quickActionsRef = useRef<HTMLDivElement | null>(null);
  const verificationRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pendingPrompt = window.sessionStorage.getItem("nairatag_agent_prefill");
    if (!pendingPrompt) return;

    window.sessionStorage.removeItem("nairatag_agent_prefill");
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      inputRef.current?.focus();
    });
  }, []);

  function scrollToSection(ref: RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusComposer() {
    scrollToSection(composerRef);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const heroMode =
    messages.length === 1 &&
    step === "await_handle" &&
    !claimedHandle &&
    !phone &&
    !verification;

  const workspaceActions = useMemo<ActionCard[]>(() => {
    if (step === "await_phone") {
      return [
        {
          eyebrow: "Phone",
          title: "Use a sandbox number",
          description: "Drop in a number and move straight into OTP testing.",
          value: "08012345678",
          tone: "sky",
        },
        {
          eyebrow: "Handle",
          title: `Continue with ${NAIRA}${claimedHandle ?? "your handle"}`,
          description: "Keep the current reservation and finish the phone check.",
          value: phone ?? "08012345678",
          tone: "violet",
        },
        {
          eyebrow: "Reset",
          title: "Start from scratch",
          description: "Clear the current session and restart the claim flow.",
          value: "reset",
          tone: "amber",
        },
      ];
    }

    if (step === "await_otp") {
      return [
        {
          eyebrow: "OTP",
          title: "Paste the sandbox OTP",
          description: devOtp
            ? `Use ${devOtp} to finish the verification step.`
            : "Use the six-digit code returned from the sandbox request.",
          value: devOtp ?? "123456",
          tone: "mint",
        },
        {
          eyebrow: "Phone",
          title: "Re-enter your number",
          description: phone
            ? `Use ${phone} again if you want to request another code.`
            : "Resend the OTP with the same test number.",
          value: phone ?? "08012345678",
          tone: "sky",
        },
        {
          eyebrow: "Reset",
          title: "Restart verification",
          description: "Reset the thread if you want to start a clean OTP cycle.",
          value: "reset",
          tone: "amber",
        },
      ];
    }

    if (step === "await_bvn") {
      return [
        {
          eyebrow: "Verification",
          title: "Attach BVN and name",
          description: "Finish the verified badge step with a sample BVN payload.",
          value: "12345678901 Victor Adeyemi",
          tone: "mint",
        },
        {
          eyebrow: "Skip",
          title: "Finish without BVN",
          description: "Complete the flow now and keep the handle as pending.",
          value: "skip",
          tone: "violet",
        },
        {
          eyebrow: "Reset",
          title: "Start again",
          description: "Clear the current claim session and try another handle.",
          value: "reset",
          tone: "amber",
        },
      ];
    }

    if (step === "done") {
      return [
        {
          eyebrow: "New claim",
          title: `Try ${NAIRA}mikki next`,
          description: "Start another end-to-end test immediately from the same page.",
          value: `${NAIRA}mikki`,
          tone: "violet",
        },
        {
          eyebrow: "Merchant",
          title: `Test ${NAIRA}shop`,
          description: "Try a more business-style handle pattern next.",
          value: `${NAIRA}shop`,
          tone: "mint",
        },
        {
          eyebrow: "Reset",
          title: "Open a fresh thread",
          description: "Clear cookies and reset the tester state.",
          value: "reset",
          tone: "amber",
        },
      ];
    }

    return [
      {
        eyebrow: "Handle",
        title: `Check ${NAIRA}victor`,
        description: "Kick off the flow with a clean personal handle example.",
        value: `${NAIRA}victor`,
        tone: "violet",
      },
      {
        eyebrow: "Handle",
        title: `Generate ${NAIRA}mikki`,
        description: "Use another short tag to test availability and claiming.",
        value: `${NAIRA}mikki`,
        tone: "sky",
      },
      {
        eyebrow: "Handle",
        title: `Try ${NAIRA}mama_ijebu`,
        description: "Use a more realistic Nigerian merchant-style handle sample.",
        value: `${NAIRA}mama_ijebu`,
        tone: "mint",
      },
    ];
  }, [claimedHandle, devOtp, phone, step]);

  async function resetConversation() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Cache-Control": "no-store" },
    });

    setMessages([
      makeMessage(
        "assistant",
        `Reset complete.\n\nSend a handle like ${NAIRA}victor to start again.`
      ),
    ]);
    setInput("");
    setStep("await_handle");
    setClaimedHandle(null);
    setPhone(null);
    setDevOtp(null);
    setVerification(null);
    setError(null);
  }

  async function appendAssistant(text: string) {
    setMessages((current) => [...current, makeMessage("assistant", text)]);
  }

  function primeInput(value?: string) {
    if (!value) return;
    if (value.toLowerCase() === "reset") {
      startTransition(() => {
        void resetConversation();
      });
      return;
    }

    setInput(value);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function handleHandleStep(raw: string) {
    const handle = extractHandle(raw);
    if (!handle) {
      await appendAssistant(
        `Send the handle you want to claim.\n\nExample: ${NAIRA}victor or ${NAIRA}mama_ijebu`
      );
      return;
    }

    const normalized = normalizeHandle(handle);
    const res = await fetch(`/api/resolve?handle=${encodeURIComponent(normalized)}`, {
      headers: { "Cache-Control": "no-store" },
    });
    const data = await readJson<ResolveResponse | ErrorResponse>(res);

    if (!res.ok) {
      const reason =
        data && "error" in data ? data.error : "Could not resolve handle.";
      setError(reason ?? "Could not resolve handle.");
      await appendAssistant(`I couldn't check that handle right now. ${reason ?? ""}`.trim());
      return;
    }

    if (!data) {
      setError("Empty resolve response");
      await appendAssistant("The resolve response came back empty. Please try again.");
      return;
    }

    if (!isResolveResponse(data)) {
      const reason = "error" in data ? data.error : "Unexpected resolve response.";
      setError(reason ?? "Unexpected resolve response.");
      await appendAssistant(reason ?? "Unexpected resolve response.");
      return;
    }

    if (data.status === "claimed") {
      setClaimedHandle(data.handle);
      setVerification(data.verification);
      await appendAssistant(
        `${NAIRA}${data.handle} is already claimed.\n${data.displayName} · ${data.bank}\n\nTry another one like ${NAIRA}mikki.`
      );
      return;
    }

    if (data.status === "invalid") {
      await appendAssistant(
        `That handle format is not valid.\nUse 2-20 characters with letters, numbers, or underscores.`
      );
      return;
    }

    setClaimedHandle(data.handle);
    setVerification("pending");
    setStep("await_phone");
    await appendAssistant(
      `${NAIRA}${data.handle} looks available.\n\nSend your phone number to receive an OTP.`
    );
  }

  async function handlePhoneStep(raw: string) {
    const parsedPhone = extractPhone(raw);
    if (!parsedPhone) {
      await appendAssistant("Please send a valid phone number like 08012345678.");
      return;
    }

    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: parsedPhone }),
    });

    const data = await readJson<{ ok?: boolean; phone?: string; devOtp?: string; error?: string }>(
      res
    );

    if (!res.ok || !data?.ok) {
      const message = data?.error ?? "Could not request OTP.";
      setError(message);
      await appendAssistant(`OTP request failed. ${message}`);
      return;
    }

    setPhone(parsedPhone);
    setDevOtp(data.devOtp ?? null);
    setStep("await_otp");
    await appendAssistant(
      `OTP sent to ${parsedPhone}.${data.devOtp ? `\nSandbox OTP: ${data.devOtp}` : ""}\n\nReply with the 6-digit code.`
    );
  }

  async function claimActiveHandle(authMethod: "otp" | "privy" = "otp") {
    if (!claimedHandle) {
      await appendAssistant("Send a handle first, then sign in to claim it.");
      return;
    }

    const claimRes = await fetch("/api/handles/claim", {
      method: "POST",
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ handle: claimedHandle }),
    });

    const claimData = await readJson<ClaimResponse | ErrorResponse>(claimRes);
    if (!claimRes.ok) {
      const message =
        claimData && "error" in claimData ? claimData.error : "Could not claim handle.";
      setError(message ?? "Could not claim handle.");

      if (claimRes.status === 409 && message === "user_already_has_handle") {
        setStep("done");
        await appendAssistant("This signed-in account already has a handle.");
        return;
      }

      if (claimRes.status === 409) {
        setStep("await_handle");
        await appendAssistant(
          `That handle was taken before we finished.\n\nTry another one like ${NAIRA}fioso.`
        );
        return;
      }

      await appendAssistant(`Handle claim failed. ${message ?? ""}`.trim());
      return;
    }

    const claimPayload = claimData && "claim" in claimData ? claimData.claim : null;
    setVerification(claimPayload?.verification ?? "pending");
    setDevOtp(null);
    setStep("await_bvn");
    await appendAssistant(
      `${authMethod === "privy" ? "Privy sign-in verified. " : "Success. "}You claimed ${NAIRA}${claimedHandle}.\n\nSend your BVN (11 digits) to add a verified badge, or type "skip".`
    );
  }

  async function handleOtpStep(raw: string) {
    const otp = extractOtp(raw);
    if (!otp) {
      await appendAssistant("Please enter the 6-digit OTP code.");
      return;
    }

    if (!phone || !claimedHandle) {
      await appendAssistant("The agent lost phone or handle state. Reset and try again.");
      return;
    }

    const verifyRes = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, code: otp }),
    });

    const verifyData = await readJson<{ ok?: boolean; error?: string }>(verifyRes);
    if (!verifyRes.ok || !verifyData?.ok) {
      const message = verifyData?.error ?? "OTP verification failed.";
      setError(message);
      await appendAssistant(`That OTP did not verify. ${message}`);
      return;
    }

    await claimActiveHandle("otp");
  }

  async function handlePrivySessionReady(user: PrivySessionUser) {
    const visibleIdentity =
      user.phone && !user.phone.startsWith("privy:")
        ? user.phone
        : user.email || user.walletAddress || "Privy";
    setPhone(visibleIdentity);
    setDevOtp(null);

    if (!claimedHandle || step === "await_handle") {
      await appendAssistant("Privy sign-in is ready. Send a handle to claim it.");
      return;
    }

    if (step === "await_phone" || step === "await_otp") {
      await claimActiveHandle("privy");
      return;
    }

    await appendAssistant("Privy sign-in is ready for this session.");
  }

  async function handleBvnStep(raw: string) {
    if (raw.trim().toLowerCase() === "skip") {
      setStep("done");
      await appendAssistant(
        `All set.\n\nYour handle is ${NAIRA}${claimedHandle ?? ""}. You can type "reset" to run another test.`
      );
      return;
    }

    const parsed = extractBvnAndName(raw);
    if (!parsed) {
      await appendAssistant(
        `Send your 11-digit BVN, optionally followed by your full name.\nExample: 12345678901 Victor Adeyemi`
      );
      return;
    }

    const res = await fetch("/api/bvn/link", {
      method: "POST",
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed),
    });

    const data = await readJson<LinkBvnResponse | ErrorResponse>(res);
    if (!res.ok) {
      const message =
        data && "error" in data ? data.error : "Could not link BVN.";
      setError(message ?? "Could not link BVN.");
      await appendAssistant(`BVN linking failed. ${message ?? ""}`.trim());
      return;
    }

    const claim = data && "claim" in data ? data.claim : null;
    const user = data && "user" in data ? data.user : undefined;
    const finalVerification = claim?.verification ?? "verified";
    setVerification(finalVerification);
    setStep("done");
    await appendAssistant(
      `Verified ${NAIRA}${claim?.handle ?? claimedHandle ?? ""} ${finalVerification === "business" ? "Business" : "Verified"}\n${claim?.displayName ?? user?.fullName ?? ""}`.trim()
    );
  }

  function onSend(event: FormEvent) {
    event.preventDefault();
    const raw = input.trim();
    if (!raw || isPending) return;

    if (raw.toLowerCase() === "reset") {
      startTransition(() => {
        setMessages((current) => [...current, makeMessage("user", raw)]);
        void resetConversation();
      });
      return;
    }

    setMessages((current) => [...current, makeMessage("user", raw)]);
    setInput("");
    setError(null);

    startTransition(() => {
      void (async () => {
        if (step === "await_handle" || step === "done") {
          await handleHandleStep(raw);
          return;
        }

        if (step === "await_phone") {
          await handlePhoneStep(raw);
          return;
        }

        if (step === "await_otp") {
          await handleOtpStep(raw);
          return;
        }

        await handleBvnStep(raw);
      })();
    });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="flex min-h-screen overflow-hidden bg-white dark:bg-zinc-950">
        <aside className="hidden w-[72px] shrink-0 border-r border-zinc-200/80 bg-zinc-50 px-2.5 py-3 dark:border-zinc-800/80 dark:bg-zinc-950 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-3">
            <div className="grid place-items-center">
              <div className="grid h-9 w-9 place-items-center rounded-[18px] bg-zinc-950 text-xs font-semibold text-white shadow-[0_14px_28px_rgba(24,24,27,0.14)]">
                {NAIRA}
              </div>
            </div>
            <div className="space-y-2.5">
              <button type="button" onClick={() => scrollToSection(overviewRef)} className="block" aria-label="Overview">
                <RailIcon kind="chat" active />
              </button>
              <button type="button" onClick={() => scrollToSection(quickActionsRef)} className="block" aria-label="Quick actions">
                <RailIcon kind="spark" />
              </button>
              <Link href={claimHistoryPath} className="block" aria-label="Claim history">
                <RailIcon kind="history" active={claimHistoryActive} />
              </Link>
              <button type="button" onClick={() => scrollToSection(verificationRef)} className="block" aria-label="Verification">
                <RailIcon kind="shield" />
              </button>
              <Link href="/admin" className="block" aria-label="Admin dashboard">
                <RailIcon kind="user" active={pathname.startsWith("/admin")} />
              </Link>
            </div>
          </div>

          <div className="space-y-2.5">
            <Link href="/" className="block">
              <RailIcon kind="home" />
            </Link>
            <button
              type="button"
              onClick={focusComposer}
              className="block"
              aria-label="Jump to input"
              title="Jump to input"
            >
              <RailIcon kind="compose" />
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-zinc-200/75 bg-white px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-950 sm:px-4 lg:px-4.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-[18px] bg-zinc-950 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950 lg:hidden">
                {NAIRA}
              </div>

              <div className="flex min-w-0 items-center gap-2.5 rounded-full border border-zinc-200/75 bg-white/88 px-2.5 py-1.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
                <div className="grid h-6.5 w-6.5 place-items-center rounded-[13px] bg-zinc-950 text-[10px] font-semibold text-white dark:bg-white dark:text-zinc-950">
                  {NAIRA}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">Assistant</div>
                  <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    <NairaTermBadge term="handle" tone="orange" className="-my-0.5" />
                  </div>
                </div>
              </div>

              <nav className="hidden items-center gap-1 rounded-full border border-zinc-200/80 bg-white/88 px-1.5 py-1 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/80 md:flex">
                <Link
                  href="/"
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  Home
                </Link>
                <Link
                  href={claimRootPath}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                    claimRootActive
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                  )}
                >
                  Claim
                </Link>
                <Link
                  href={claimHistoryPath}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                    claimHistoryActive
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                  )}
                >
                  History
                </Link>
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  Admin
                </Link>
              </nav>

              <div className="ml-auto">
                <ThemeToggle className="px-3 py-1.5 text-[12px]" />
              </div>

            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-2.5 pt-2.5 sm:px-3.5 lg:px-5 lg:pt-3">
                <div ref={overviewRef} className="mx-auto flex min-h-full w-full max-w-[880px] flex-col">
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="orange">{humanizeStep(step)}</Badge>
                    {claimedHandle ? <Badge tone="verify">{`${NAIRA}${claimedHandle}`}</Badge> : null}
                    {phone ? <Badge>{phone}</Badge> : null}
                    {verification ? (
                      <Badge tone={verification === "pending" ? "orange" : "verify"}>
                        {verification}
                      </Badge>
                    ) : null}
                    {devOtp ? <Badge tone="verify">{`OTP ${devOtp}`}</Badge> : null}
                  </div>

                  {heroMode ? (
                    <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col pt-3 text-center sm:pt-4 lg:pt-5">
                      <div className="mx-auto nt-assistant-orb" />
                      <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-white/85 bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Claim assistant
                      </div>

                      <h1 className="mt-3.5 text-[1.55rem] font-semibold tracking-tight text-zinc-950 sm:text-[2.2rem] sm:leading-[1.02]">
                        Hi! I&apos;m your NairaTag Assistant.
                        <br />
                        How can I help you today?
                      </h1>

                      <p className="mx-auto mt-2.5 max-w-[560px] text-[13px] leading-5 text-zinc-500 sm:text-sm">
                        Resolve a handle, verify phone with sandbox OTP, claim it, then
                        optionally attach BVN for a trusted badge.
                      </p>

                      <div ref={quickActionsRef} className="mx-auto mt-5 w-full max-w-[680px]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick actions</div>
                          <button
                            type="button"
                            onClick={() => {
                              startTransition(() => {
                                void resetConversation();
                              });
                            }}
                            className="text-xs font-semibold text-zinc-400 transition hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                          >
                            Reset actions
                          </button>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-3">
                          {workspaceActions.map((action) => (
                            <ActionButtonCard key={action.title} action={action} onClick={primeInput} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto flex w-full max-w-[700px] flex-1 flex-col pb-2">
                      <div ref={verificationRef} className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-white/85 bg-white/84 p-3.5 shadow-[0_14px_34px_rgba(15,23,42,0.045)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.26)]">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                            Current step
                          </div>
                          <div className="mt-2 text-[15px] font-semibold text-zinc-950 dark:text-zinc-50">
                            {humanizeStep(step)}
                          </div>
                          <div className="mt-1.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
                            The assistant is guiding this claim flow one step at a time.
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-white/85 bg-white/84 p-3.5 shadow-[0_14px_34px_rgba(15,23,42,0.045)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.26)]">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                            Handle
                          </div>
                          <div className="mt-2 text-[15px] font-semibold text-zinc-950 dark:text-zinc-50">
                            {claimedHandle ? `${NAIRA}${claimedHandle}` : "Not claimed yet"}
                          </div>
                          <div className="mt-1.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
                            {claimedHandle
                              ? "Your active test handle is locked into this session."
                              : "Start with a handle to begin the resolution and claim flow."}
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-white/85 bg-white/84 p-3.5 shadow-[0_14px_34px_rgba(15,23,42,0.045)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.26)]">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                            Verification
                          </div>
                          <div className="mt-2 text-[15px] font-semibold text-zinc-950 dark:text-zinc-50">
                            {verification ?? "Sandbox"}
                          </div>
                          <div className="mt-1.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
                            {devOtp
                              ? `Sandbox OTP ${devOtp} is ready for this run.`
                              : "BVN remains optional in this phase, but you can still test the badge flow."}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex-1 overflow-y-auto">
                        <div className="flex flex-col gap-3 pr-1">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                "flex",
                                message.role === "user" ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[94%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[78%]",
                                  message.role === "user"
                                    ? "bg-zinc-950 text-white shadow-[0_20px_40px_rgba(24,24,27,0.16)]"
                                    : "border border-white/90 bg-white/92 text-zinc-800 shadow-[0_18px_42px_rgba(15,23,42,0.05)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:shadow-[0_10px_28px_rgba(0,0,0,0.26)]"
                                )}
                              >
                                {message.text.split("\n").map((line, index) => (
                                  <p key={`${message.id}_${index}`}>{line || "\u00A0"}</p>
                                ))}
                              </div>
                            </div>
                          ))}

                          {error ? (
                            <div className="rounded-[22px] border border-orange-200/80 bg-orange-50/94 px-4 py-3 text-sm text-orange-950 shadow-sm dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-100">
                              <div className="font-semibold">Last error</div>
                              <div className="mt-1">{error}</div>
                            </div>
                          ) : null}

                          {devOtp ? (
                            <div className="rounded-[22px] border border-emerald-200/80 bg-emerald-50/94 px-4 py-3 text-sm text-emerald-950 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
                              <div className="flex items-center gap-2 font-semibold">
                                <CheckIcon className="h-4 w-4" />
                                Sandbox OTP ready
                              </div>
                              <div className="mt-1">Use {devOtp} for this run.</div>
                            </div>
                          ) : null}

                          <div ref={bottomRef} />
                        </div>
                      </div>

                      <div ref={quickActionsRef} className="mt-3 grid gap-2 md:grid-cols-3">
                        {workspaceActions.map((action) => (
                          <ActionButtonCard key={action.title} action={action} onClick={primeInput} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div ref={composerRef} className="border-t border-zinc-200/75 bg-white px-2.5 py-2 dark:border-zinc-800/80 dark:bg-zinc-950 sm:px-3.5 lg:px-5">
                <div className="mx-auto w-full max-w-[720px]">
                  <form onSubmit={onSend}>
                    <div className="rounded-[22px] border border-zinc-200/80 bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.04)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
                            Send a test message
                          </div>
                          <div className="mt-0.5 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
                            Handle, phone, OTP, or BVN depending on the current step.
                          </div>
                        </div>

                        <PrivySessionButton onSessionReady={handlePrivySessionReady} />
                      </div>

                      <div className="mt-2.5 rounded-[18px] border border-zinc-200/75 bg-white px-3 py-2.5 shadow-inner shadow-zinc-100/80 dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-black/20">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            ref={inputRef}
                            id="agent-input"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder={
                              step === "await_handle"
                                ? `${NAIRA}victor`
                                : step === "await_phone"
                                  ? "08012345678"
                                  : step === "await_otp"
                                    ? devOtp ?? "123456"
                                    : step === "await_bvn"
                                      ? '12345678901 Victor Adeyemi or "skip"'
                                      : `${NAIRA}mikki`
                            }
                            className="min-h-[40px] w-full bg-transparent text-[14px] font-medium text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                          />

                          <button
                            type="submit"
                            disabled={isPending || !input.trim()}
                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(24,24,27,0.14)] transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPending ? "Sending..." : "Send"}
                          </button>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <SamplePrompt text="reset" onClick={primeInput} />
                          {step === "await_otp" && devOtp ? (
                            <SamplePrompt text={devOtp} onClick={primeInput} />
                          ) : null}
                          {step === "await_bvn" ? (
                            <SamplePrompt text="skip" onClick={primeInput} />
                          ) : null}
                          {step !== "await_handle" ? (
                            <SamplePrompt
                              text={`${NAIRA}${claimedHandle ?? "victor"}`}
                              onClick={primeInput}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </form>

                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
