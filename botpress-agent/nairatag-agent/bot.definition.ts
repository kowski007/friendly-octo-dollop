import { BotDefinition, z } from "@botpress/sdk";

const verificationSchema = z.enum(["pending", "verified", "business"]);

export default new BotDefinition({
  secrets: {
    NAIRATAG_API_BASE_URL: {
      optional: true,
      description:
        "Base URL for your NairaTag API (used by actions when apiBaseUrl is not provided). Example: https://nairatag.ng",
    },
  },
  actions: {
    resolveHandle: {
      title: "Resolve NairaTag handle",
      description: "Checks whether a handle is available or already claimed.",
      input: {
        schema: z.object({
          handle: z.string().min(2).max(40),
          apiBaseUrl: z.string().url().optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          status: z.enum(["claimed", "available", "invalid", "error"]),
          handle: z.string().optional(),
          displayName: z.string().optional(),
          bank: z.string().optional(),
          verification: verificationSchema.optional(),
          reason: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
    requestPhoneOtp: {
      title: "Request phone OTP",
      description: "Sends an OTP to a phone number for claim verification.",
      input: {
        schema: z.object({
          phone: z.string().min(7).max(24),
          apiBaseUrl: z.string().url().optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          phone: z.string().optional(),
          devOtp: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
    verifyPhoneOtp: {
      title: "Verify phone OTP",
      description:
        "Verifies OTP and returns session cookie for authenticated actions.",
      input: {
        schema: z.object({
          phone: z.string().min(7).max(24),
          code: z.string().min(4).max(10),
          apiBaseUrl: z.string().url().optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          userId: z.string().optional(),
          phone: z.string().optional(),
          sessionCookie: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
    claimHandle: {
      title: "Claim handle",
      description: "Claims a NairaTag handle for a verified session.",
      input: {
        schema: z.object({
          handle: z.string().min(2).max(40),
          sessionCookie: z.string().min(5),
          apiBaseUrl: z.string().url().optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          claimId: z.string().optional(),
          handle: z.string().optional(),
          verification: verificationSchema.optional(),
          error: z.string().optional(),
        }),
      },
    },
    linkBvn: {
      title: "Link BVN",
      description: "Links BVN to user and upgrades verification status.",
      input: {
        schema: z.object({
          bvn: z.string().min(11).max(11),
          fullName: z.string().min(2).max(120).optional(),
          sessionCookie: z.string().min(5),
          apiBaseUrl: z.string().url().optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          bvnLinked: z.boolean(),
          verification: verificationSchema.optional(),
          displayName: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
  },
});
