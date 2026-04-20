# Brunch24 Botpress Agent

Brunch24 V1 Botpress bot scaffold for:

- food vendor discovery
- restaurant reservation requests
- hotel enquiry requests
- event discovery and RSVP requests
- vendor onboarding
- featured placement leads

This project is intentionally V1-safe:

- no payments
- no NairaTag
- no ride orchestration
- all bookings are manual confirmation flows

## Project shape

- `bot.definition.ts` declares Brunch24 actions and schemas
- `src/index.ts` implements the action logic
- `src/catalog.ts` contains seed directory data for local testing

## Local development

1. Install dependencies:

```powershell
cd C:\Users\olusegun\Desktop\myTAG\botpress-agent\brunch24-agent
npm.cmd install
```

2. Run the bot locally:

```powershell
bp.cmd dev --workDir C:\Users\olusegun\Desktop\myTAG\botpress-agent\brunch24-agent --secrets BRUNCH24_OPERATIONS_PHONE=+2340000000000
```

3. Build when you want generated typings and a bundle:

```powershell
bp.cmd build --workDir C:\Users\olusegun\Desktop\myTAG\botpress-agent\brunch24-agent
```

## Current actions

- `searchFoodVendors`
- `requestTableBooking`
- `searchHotels`
- `requestHotelBooking`
- `searchEvents`
- `requestEventRsvp`
- `onboardVendor`
- `requestFeaturedPlacement`

## Notes

- The current directory is mock data for fast iteration.
- The next layer can swap the seed data for Firebase, Supabase, or any Brunch24 backend.
- Conversation design, channel formatting, and live integrations can be layered on top after the action surface is stable.
