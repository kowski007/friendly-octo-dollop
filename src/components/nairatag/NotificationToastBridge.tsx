"use client";

import { useEffect, useRef } from "react";

import type { NotificationRecord } from "@/lib/adminTypes";
import { useToast, type ToastTone } from "./ToastProvider";

type NotificationsResponse =
  | {
      ok: true;
      items: NotificationRecord[];
    }
  | { error: string };

function toastToneForNotification(notification: NotificationRecord): ToastTone {
  if (
    notification.type === "payment_failed" ||
    notification.type === "settlement_failed" ||
    notification.type === "marketplace_transfer_rejected"
  ) {
    return "error";
  }

  if (
    notification.priority === "high" ||
    notification.type === "suspicious_activity" ||
    notification.type === "admin_review_required"
  ) {
    return "warning";
  }

  if (
    notification.type === "welcome_reward" ||
    notification.type === "payment_received" ||
    notification.type === "settlement_completed" ||
    notification.type === "handle_claimed" ||
    notification.type === "handle_sold" ||
    notification.type === "telegram_link_requested" ||
    notification.type === "telegram_verified" ||
    notification.type === "telegram_unlinked" ||
    notification.type === "paylink_created" ||
    notification.type === "marketplace_listing_created" ||
    notification.type === "marketplace_listing_updated" ||
    notification.type === "referral_signup" ||
    notification.type === "referral_converted" ||
    notification.type === "referral_points_awarded" ||
    notification.type === "bvn_linked" ||
    notification.type === "bank_linked"
  ) {
    return "success";
  }

  return "info";
}

export function NotificationToastBridge() {
  const { toast } = useToast();
  const hydratedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function pullNotifications() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      try {
        const response = await fetch("/api/notifications/me?limit=12&unread=1", {
          headers: {
            "Cache-Control": "no-store",
          },
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json().catch(() => null)) as NotificationsResponse | null;
        if (cancelled || !body || !("ok" in body)) {
          return;
        }

        const unreadItems = body.items.filter((item) => item.status === "unread");
        if (!hydratedRef.current) {
          hydratedRef.current = true;
          unreadItems.forEach((item) => seenIdsRef.current.add(item.id));
          return;
        }

        const freshItems = unreadItems.filter((item) => !seenIdsRef.current.has(item.id));
        unreadItems.forEach((item) => seenIdsRef.current.add(item.id));

        freshItems
          .slice()
          .reverse()
          .forEach((item) => {
            toast({
              title: item.title,
              description: item.body,
              tone: toastToneForNotification(item),
              durationMs: item.priority === "high" ? 7000 : 5000,
            });
          });
      } catch {
        // Silent by design. The inbox remains the source of truth.
      }
    }

    void pullNotifications();
    const interval = window.setInterval(() => {
      void pullNotifications();
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [toast]);

  return null;
}
