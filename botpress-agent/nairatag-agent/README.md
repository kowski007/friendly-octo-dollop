# NairaTag Botpress Agent (Phase 0)

This bot project adds Botpress actions that call the NairaTag Phase 0 API:

- `resolveHandle` -> `GET /api/resolve?handle=...`
- `requestPhoneOtp` -> `POST /api/auth/otp/request`
- `verifyPhoneOtp` -> `POST /api/auth/otp/verify` (returns `nt_session` cookie)
- `claimHandle` -> `POST /api/handles/claim` (uses cookie)
- `linkBvn` -> `POST /api/bvn/link` (uses cookie)

## Local development

1. Start the NairaTag web app:

```powershell
cd C:\Users\olusegun\Desktop\myTAG
npm.cmd run dev
```

2. In a new terminal, run the bot in dev mode:

```powershell
cd C:\Users\olusegun\Desktop\myTAG\botpress-agent\nairatag-agent
bp.cmd dev --secrets NAIRATAG_API_BASE_URL=http://127.0.0.1:3000
```

If you want to point the bot at a public environment, change `NAIRATAG_API_BASE_URL`.

## Build and deploy (Botpress Cloud)

```powershell
cd C:\Users\olusegun\Desktop\myTAG\botpress-agent\nairatag-agent
bp.cmd build
bp.cmd deploy --botId <YOUR_BOT_ID>
```

Note: your workspace currently has a quota of 1 bot. If you need to deploy this
to a different bot, you may need to delete the existing bot or upgrade the plan.

