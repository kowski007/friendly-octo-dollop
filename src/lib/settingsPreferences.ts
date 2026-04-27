import type { NotificationRecord } from "./adminTypes";

export type SettingsNotificationBucket = "payments" | "activity" | "account";

export type SettingsNotificationPreferences = {
  liveToasts: boolean;
  paymentToasts: boolean;
  activityToasts: boolean;
  accountToasts: boolean;
};

export const SETTINGS_NOTIFICATION_STORAGE_KEY = "nt-settings-notifications-v1";

export const DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES: SettingsNotificationPreferences = {
  liveToasts: true,
  paymentToasts: true,
  activityToasts: true,
  accountToasts: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function notificationBucketForRecord(
  notification: Pick<NotificationRecord, "type">
): SettingsNotificationBucket {
  if (
    notification.type.startsWith("payment_") ||
    notification.type.startsWith("paylink_") ||
    notification.type.startsWith("settlement_") ||
    notification.type.startsWith("receipt_")
  ) {
    return "payments";
  }

  if (
    notification.type.startsWith("marketplace_") ||
    notification.type.startsWith("referral_") ||
    notification.type === "handle_sold" ||
    notification.type === "handle_claimed"
  ) {
    return "activity";
  }

  return "account";
}

export function shouldToastNotification(
  notification: Pick<NotificationRecord, "type">,
  preferences: SettingsNotificationPreferences
) {
  if (!preferences.liveToasts) return false;

  const bucket = notificationBucketForRecord(notification);
  if (bucket === "payments") return preferences.paymentToasts;
  if (bucket === "activity") return preferences.activityToasts;
  return preferences.accountToasts;
}

export function readSettingsNotificationPreferences(
  storage?: Pick<Storage, "getItem"> | null
) {
  if (!storage) {
    return DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES;
  }

  try {
    const raw = storage.getItem(SETTINGS_NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES;
    }

    return {
      liveToasts:
        typeof parsed.liveToasts === "boolean"
          ? parsed.liveToasts
          : DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES.liveToasts,
      paymentToasts:
        typeof parsed.paymentToasts === "boolean"
          ? parsed.paymentToasts
          : DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES.paymentToasts,
      activityToasts:
        typeof parsed.activityToasts === "boolean"
          ? parsed.activityToasts
          : DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES.activityToasts,
      accountToasts:
        typeof parsed.accountToasts === "boolean"
          ? parsed.accountToasts
          : DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES.accountToasts,
    };
  } catch {
    return DEFAULT_SETTINGS_NOTIFICATION_PREFERENCES;
  }
}

export function writeSettingsNotificationPreferences(
  preferences: SettingsNotificationPreferences,
  storage?: Pick<Storage, "setItem"> | null
) {
  if (!storage) return;

  try {
    storage.setItem(SETTINGS_NOTIFICATION_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage writes should never break the app UI
  }
}

