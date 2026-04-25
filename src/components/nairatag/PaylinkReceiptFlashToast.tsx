"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useToast } from "./ToastProvider";

export function PaylinkReceiptFlashToast() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("status")?.trim().toLowerCase() || "";
    if (!status || lastStatusRef.current === status) return;
    lastStatusRef.current = status;

    if (status === "paid" || status === "successful" || status === "completed") {
      toast({
        title: "Payment confirmed",
        description: "Your payment has been verified and the receipt is ready.",
        tone: "success",
      });
      return;
    }

    if (status === "failed" || status === "cancelled") {
      toast({
        title: "Payment not completed",
        description: "This checkout did not complete successfully.",
        tone: "warning",
      });
      return;
    }

    if (status === "pending" || status === "processing") {
      toast({
        title: "Payment processing",
        description: "We're still verifying this payment and will update the receipt shortly.",
        tone: "info",
      });
    }
  }, [searchParams, toast]);

  return null;
}
