import {
  createNotification,
  getClaimByHandle,
  recordTransaction,
} from "@/lib/adminStore";

import {
  attachCheckoutUrlToPayment,
  createPaylinkPaymentRecord,
  ensurePaylinkSettlement,
  getPaylinkByShortCode,
  getPaylinkPaymentById,
  getPaylinkPaymentByProcessorTransactionId,
  getPaylinkPaymentByTxRef,
  getSettlementByPaymentId,
  getSettlementByProcessorTransferId,
  getSettlementByTransferReference,
  markPaylinkPaymentFailed,
  markPaylinkPaymentPaid,
  markSettlementFailed,
  markSettlementProcessing,
  markSettlementSkipped,
  markSettlementSuccessful,
  recordPaylinkWebhookEventOnce,
} from "./db";
import {
  createHostedPayment,
  createTransfer,
  hasFlutterwaveConfig,
  verifyTransaction,
} from "./flutterwave";
import type {
  PaylinkPaymentRecord,
  PaylinkRecord,
  PaylinkSettlementRecord,
} from "./types";

const NAIRA = "\u20A6";

function amountLabel(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.round(kobo / 100));
}

function toNairaWhole(kobo: number) {
  return Math.round(kobo / 100);
}

export function resolvePaylinkChargeAmountKobo({
  paylink,
  requestedAmountNaira,
}: {
  paylink: PaylinkRecord;
  requestedAmountNaira?: number;
}) {
  const requestedKobo =
    requestedAmountNaira && Number.isFinite(requestedAmountNaira) && requestedAmountNaira > 0
      ? Math.round(requestedAmountNaira) * 100
      : undefined;

  if (paylink.status !== "active") {
    throw new Error("paylink_inactive");
  }
  if (paylink.expiresAt && new Date(paylink.expiresAt).getTime() <= Date.now()) {
    throw new Error("paylink_expired");
  }
  if (paylink.maxUses && paylink.useCount >= paylink.maxUses) {
    throw new Error("paylink_exhausted");
  }

  switch (paylink.amountType) {
    case "fixed":
      if (!paylink.amountKobo) throw new Error("invalid_paylink_amount");
      return paylink.amountKobo;
    case "open":
      if (!requestedKobo) throw new Error("amount_required");
      return requestedKobo;
    case "range":
      if (!requestedKobo) throw new Error("amount_required");
      if (
        (paylink.amountMinKobo && requestedKobo < paylink.amountMinKobo) ||
        (paylink.amountMaxKobo && requestedKobo > paylink.amountMaxKobo)
      ) {
        throw new Error("amount_out_of_range");
      }
      return requestedKobo;
    case "suggested":
      if (!requestedKobo) throw new Error("amount_required");
      return requestedKobo;
    default:
      throw new Error("unsupported_paylink_amount_type");
  }
}

async function notifyPaymentReceived(
  paylink: PaylinkRecord,
  payment: PaylinkPaymentRecord
) {
  const payer = payment.payerName?.trim() || payment.payerEmail || "A customer";
  await createNotification({
    userId: paylink.ownerId,
    handle: paylink.handle,
    type: "payment_received",
    title: "PayLink payment received",
    body: `${payer} paid ${amountLabel(payment.amountKobo)} to ${NAIRA}${paylink.handle}. Receipt ${payment.receiptNumber} is ready.`,
    priority: "normal",
    metadata: {
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      txRef: payment.txRef,
      status: payment.status,
    },
  }).catch(() => null);
}

async function notifyPaymentFailed(
  paylink: PaylinkRecord,
  payment: PaylinkPaymentRecord,
  reason: string
) {
  await createNotification({
    userId: paylink.ownerId,
    handle: paylink.handle,
    type: "payment_failed",
    title: "PayLink payment failed",
    body: `A Flutterwave checkout for ${NAIRA}${paylink.handle} did not complete: ${reason}.`,
    priority: "normal",
    metadata: {
      paymentId: payment.id,
      txRef: payment.txRef,
      status: payment.status,
    },
  }).catch(() => null);
}

async function notifySettlementFailed(
  paylink: PaylinkRecord,
  settlement: PaylinkSettlementRecord,
  reason: string
) {
  await createNotification({
    userId: paylink.ownerId,
    handle: paylink.handle,
    type: "settlement_failed",
    title: "PayLink settlement failed",
    body: `Payout to ${paylink.recipientBank} for ${NAIRA}${paylink.handle} needs review: ${reason}.`,
    priority: "high",
    metadata: {
      settlementId: settlement.id,
      transferReference: settlement.transferReference,
      reason,
    },
  }).catch(() => null);
}

async function notifySettlementCompleted(
  paylink: PaylinkRecord,
  settlement: PaylinkSettlementRecord
) {
  await createNotification({
    userId: paylink.ownerId,
    handle: paylink.handle,
    type: "settlement_completed",
    title: "PayLink settlement completed",
    body: `${amountLabel(settlement.amountKobo)} has been routed to ${paylink.recipientBank} for ${NAIRA}${paylink.handle}.`,
    priority: "normal",
    metadata: {
      settlementId: settlement.id,
      transferReference: settlement.transferReference,
      status: settlement.status,
    },
  }).catch(() => null);
}

export async function startPaylinkCheckout(input: {
  paylink: PaylinkRecord;
  requestedAmountNaira?: number;
  payerName?: string;
  payerEmail: string;
  payerPhone?: string;
  note?: string;
  customFields?: Record<string, unknown>;
  appBaseUrl: string;
}) {
  if (!hasFlutterwaveConfig()) throw new Error("flutterwave_not_configured");

  const amountKobo = resolvePaylinkChargeAmountKobo({
    paylink: input.paylink,
    requestedAmountNaira: input.requestedAmountNaira,
  });

  const payment = await createPaylinkPaymentRecord({
    paylink: input.paylink,
    amountKobo,
    payerName: input.payerName,
    payerEmail: input.payerEmail,
    payerPhone: input.payerPhone,
    note: input.note,
    customFields: input.customFields,
    metadata: {
      startedFrom: "public_paylink_checkout",
    },
  });

  try {
    const redirectUrl = `${input.appBaseUrl}/api/paylinks/flutterwave/callback?payment_id=${encodeURIComponent(payment.id)}`;
    const checkout = await createHostedPayment({
      txRef: payment.txRef,
      amountNaira: toNairaWhole(amountKobo),
      redirectUrl,
      customer: {
        email: payment.payerEmail,
        name: payment.payerName,
        phoneNumber: payment.payerPhone,
      },
      customizations: {
        title: input.paylink.title || `${NAIRA}${input.paylink.handle}`,
        description:
          input.paylink.description ||
          `Pay ${input.paylink.recipientName} through NairaTag`,
        logoUrl: input.paylink.logoUrl,
      },
      meta: {
        payment_id: payment.id,
        paylink_id: input.paylink.id,
        short_code: input.paylink.shortCode,
      },
    });

    const updated = await attachCheckoutUrlToPayment({
      paymentId: payment.id,
      checkoutUrl: checkout.checkoutUrl,
    });
    if (!updated?.processorCheckoutUrl) throw new Error("checkout_url_missing");

    return {
      payment: updated,
      checkoutUrl: updated.processorCheckoutUrl,
    };
  } catch (error) {
    await markPaylinkPaymentFailed({
      paymentId: payment.id,
      processorStatus: "checkout_error",
      metadata: {
        reason: error instanceof Error ? error.message : "checkout_create_failed",
      },
    }).catch(() => null);
    throw error;
  }
}

async function triggerSettlementForPayment({
  payment,
  paylink,
  appBaseUrl,
}: {
  payment: PaylinkPaymentRecord;
  paylink: PaylinkRecord;
  appBaseUrl: string;
}) {
  let settlement = await getSettlementByPaymentId(payment.id);
  if (!settlement) {
    settlement = await ensurePaylinkSettlement({ payment, paylink });
  }

  if (settlement.status !== "queued") return settlement;

  if (settlement.amountKobo <= 0) {
    const skipped = await markSettlementSkipped({
      settlementId: settlement.id,
      reason: "net_amount_zero",
      processorResponse: {
        platformFeeKobo: payment.platformFeeKobo,
        processorFeeKobo: payment.processorFeeKobo,
      },
    });
    return skipped ?? settlement;
  }

  try {
    const transfer = await createTransfer({
      amountKobo: settlement.amountKobo,
      reference: settlement.transferReference,
      accountNumber: paylink.recipientNuban,
      bankCode: paylink.recipientBankCode,
      accountName: paylink.recipientName,
      narration: `NairaTag PayLink ${paylink.shortCode}`,
      callbackUrl: `${appBaseUrl}/api/paylinks/flutterwave/webhook`,
    });

    const processing = await markSettlementProcessing({
      settlementId: settlement.id,
      processorTransferId: transfer.transferId,
      processorBeneficiaryId: transfer.beneficiaryId,
      processorResponse: {
        flutterwaveStatus: transfer.status,
        response: transfer.raw,
      },
    });

    if (transfer.status === "successful" || transfer.status === "completed") {
      const successful = await markSettlementSuccessful({
        settlementId: settlement.id,
        processorTransferId: transfer.transferId,
        processorResponse: {
          flutterwaveStatus: transfer.status,
          response: transfer.raw,
        },
      });
      if (successful) {
        await notifySettlementCompleted(paylink, successful);
      }
      return successful ?? processing ?? settlement;
    }

    return processing ?? settlement;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "flutterwave_transfer_failed";
    const failed = await markSettlementFailed({
      settlementId: settlement.id,
      failureReason: message,
      processorResponse: {
        stage: "create_transfer",
      },
    });
    await notifySettlementFailed(paylink, failed ?? settlement, message);
    return failed ?? settlement;
  }
}

export async function reconcileFlutterwaveCharge(input: {
  transactionId: string;
  txRef?: string;
  source: "callback" | "webhook";
  eventKey?: string;
  eventType?: string;
  eventPayload?: Record<string, unknown>;
  appBaseUrl: string;
}) {
  if (input.eventKey) {
    const firstSeen = await recordPaylinkWebhookEventOnce({
      provider: "flutterwave",
      eventKey: input.eventKey,
      eventType: input.eventType || "charge.completed",
      payload: input.eventPayload ?? {},
    });
    if (!firstSeen) {
      const existing =
        (input.txRef ? await getPaylinkPaymentByTxRef(input.txRef) : null) ||
        (await getPaylinkPaymentByProcessorTransactionId(input.transactionId));
      if (!existing) return null;
      const paylink = await getPaylinkByShortCode(existing.paylinkShortCode);
      const settlement = await getSettlementByPaymentId(existing.id);
      return paylink ? { paylink, payment: existing, settlement } : null;
    }
  }

  const verified = await verifyTransaction(input.transactionId);
  const payment =
    (verified.txRef ? await getPaylinkPaymentByTxRef(verified.txRef) : null) ||
    (await getPaylinkPaymentByProcessorTransactionId(input.transactionId)) ||
    (input.txRef ? await getPaylinkPaymentByTxRef(input.txRef) : null);

  if (!payment) throw new Error("payment_not_found");
  const paylink = await getPaylinkByShortCode(payment.paylinkShortCode);
  if (!paylink) throw new Error("paylink_not_found");

  if (verified.currency !== "NGN") {
    throw new Error("invalid_flutterwave_currency");
  }
  if (verified.amountKobo !== payment.amountKobo) {
    throw new Error("flutterwave_amount_mismatch");
  }

  if (verified.status === "successful" || verified.status === "completed") {
    const result = await markPaylinkPaymentPaid({
      paymentId: payment.id,
      processorTransactionId: verified.id,
      processorReference: verified.flwRef,
      processorStatus: verified.status,
      processorFeeKobo: verified.processorFeeKobo,
      metadata: {
        reconciledFrom: input.source,
      },
    });

    if (result.newlyPaid) {
      await recordTransaction({
        handle: paylink.handle,
        amount: toNairaWhole(result.payment.amountKobo),
        status: "settled",
        channel: "payment_link",
        reference: result.payment.txRef,
        note: result.payment.note || "Flutterwave PayLink payment",
        senderName: result.payment.payerName,
        senderPhone: result.payment.payerPhone,
        metadata: {
          provider: "flutterwave",
          externalStatus: verified.status,
          sourcePage: `paylink_${input.source}`,
        },
      }).catch(() => null);

      await notifyPaymentReceived(paylink, result.payment);
    }

    const settlement = await triggerSettlementForPayment({
      payment: result.payment,
      paylink,
      appBaseUrl: input.appBaseUrl,
    });

    return {
      paylink,
      payment: result.payment,
      settlement,
    };
  }

  const failed = await markPaylinkPaymentFailed({
    paymentId: payment.id,
    processorStatus: verified.status,
    processorTransactionId: verified.id,
    processorReference: verified.flwRef,
    metadata: {
      reconciledFrom: input.source,
    },
  });

  if (failed) {
    await notifyPaymentFailed(paylink, failed, verified.status);
  }

  return {
    paylink,
    payment: failed ?? payment,
    settlement: await getSettlementByPaymentId(payment.id),
  };
}

export async function markPaylinkCancelledByTxRef(txRef: string, reason: string) {
  const payment = await getPaylinkPaymentByTxRef(txRef);
  if (!payment) return null;
  const paylink = await getPaylinkByShortCode(payment.paylinkShortCode);
  const failed = await markPaylinkPaymentFailed({
    paymentId: payment.id,
    processorStatus: reason,
    metadata: {
      cancelledFrom: "callback",
    },
  });
  if (paylink && failed) {
    await notifyPaymentFailed(paylink, failed, reason);
  }
  return failed;
}

export async function reconcileFlutterwaveTransferEvent(input: {
  transferId?: string;
  reference?: string;
  status: string;
  eventKey?: string;
  eventType?: string;
  payload?: Record<string, unknown>;
}) {
  if (input.eventKey) {
    const firstSeen = await recordPaylinkWebhookEventOnce({
      provider: "flutterwave",
      eventKey: input.eventKey,
      eventType: input.eventType || "transfer.update",
      payload: input.payload ?? {},
    });
    if (!firstSeen) return null;
  }

  const settlement =
    (input.transferId
      ? await getSettlementByProcessorTransferId(input.transferId)
      : null) ||
    (input.reference ? await getSettlementByTransferReference(input.reference) : null);
  if (!settlement) return null;

  const payment = await getPaylinkPaymentById(settlement.paymentId);
  const paylink = payment
    ? await getPaylinkByShortCode(payment.paylinkShortCode)
    : null;

  if (input.status === "successful" || input.status === "completed") {
    const previousStatus = settlement.status;
    const successful = await markSettlementSuccessful({
      settlementId: settlement.id,
      processorTransferId: input.transferId,
      processorResponse: input.payload,
    });
    if (paylink && successful && previousStatus !== "successful") {
      await notifySettlementCompleted(paylink, successful);
    }
    return successful;
  }

  const failed = await markSettlementFailed({
    settlementId: settlement.id,
    failureReason: input.status,
    processorTransferId: input.transferId,
    processorResponse: input.payload,
  });
  if (paylink && failed) {
    await notifySettlementFailed(paylink, failed, input.status);
  }
  return failed;
}

export async function getPaylinkOwnerHandle(paylink: PaylinkRecord) {
  return getClaimByHandle(paylink.handle);
}
