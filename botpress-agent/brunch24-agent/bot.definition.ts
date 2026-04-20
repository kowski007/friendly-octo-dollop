import { BotDefinition, z } from '@botpress/sdk'

const budgetSchema = z.enum(['budget', 'midrange', 'premium'])

const vendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  area: z.string(),
  cuisine: z.string(),
  averageSpendNgn: z.number().int().positive(),
  trustNote: z.string(),
  shortDescription: z.string(),
})

const hotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  area: z.string(),
  nightlyRateNgn: z.number().int().positive(),
  ratingLabel: z.string(),
  shortDescription: z.string(),
})

const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  city: z.string(),
  area: z.string(),
  date: z.string(),
  ticketType: z.string(),
  ticketPriceNgn: z.number().int().nonnegative(),
  shortDescription: z.string(),
})

const bookingStatusSchema = z.enum(['request_queued', 'manual_confirmation_required'])

export default new BotDefinition({
  secrets: {
    BRUNCH24_OPERATIONS_PHONE: {
      optional: true,
      description: 'WhatsApp or phone number Brunch24 uses for manual vendor follow-up.',
    },
  },
  actions: {
    searchFoodVendors: {
      title: 'Search food vendors',
      description: 'Finds restaurants and food vendors from the Brunch24 seed directory.',
      input: {
        schema: z.object({
          query: z.string().max(120).optional(),
          city: z.string().max(80).optional(),
          area: z.string().max(80).optional(),
          cuisine: z.string().max(80).optional(),
          budget: budgetSchema.optional(),
          partySize: z.number().int().min(1).max(20).optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          summary: z.string(),
          vendors: z.array(vendorSchema),
          paymentModel: z.literal('pay_at_venue'),
        }),
      },
    },
    requestTableBooking: {
      title: 'Request table booking',
      description: 'Creates a call-to-confirm restaurant reservation request for Brunch24 V1.',
      input: {
        schema: z.object({
          vendorId: z.string().min(2),
          customerName: z.string().min(2).max(120),
          customerPhone: z.string().min(7).max(24),
          partySize: z.number().int().min(1).max(20),
          date: z.string().min(3).max(40),
          time: z.string().min(1).max(40),
          occasion: z.string().max(120).optional(),
          notes: z.string().max(240).optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          bookingReference: z.string().optional(),
          status: bookingStatusSchema,
          restaurantName: z.string().optional(),
          paymentModel: z.literal('pay_at_venue'),
          summary: z.string(),
          operationsPhone: z.string().optional(),
        }),
      },
    },
    searchHotels: {
      title: 'Search hotels',
      description: 'Finds hotels from the Brunch24 seed directory for enquiry-first booking.',
      input: {
        schema: z.object({
          city: z.string().max(80).optional(),
          area: z.string().max(80).optional(),
          maxNightlyRateNgn: z.number().int().positive().optional(),
          rooms: z.number().int().min(1).max(6).optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          summary: z.string(),
          hotels: z.array(hotelSchema),
          paymentModel: z.literal('pay_at_property'),
        }),
      },
    },
    requestHotelBooking: {
      title: 'Request hotel booking',
      description: 'Creates a hotel enquiry for manual confirmation in Brunch24 V1.',
      input: {
        schema: z.object({
          hotelId: z.string().min(2),
          guestName: z.string().min(2).max(120),
          guestPhone: z.string().min(7).max(24),
          checkIn: z.string().min(3).max(40),
          checkOut: z.string().min(3).max(40),
          rooms: z.number().int().min(1).max(6),
          guests: z.number().int().min(1).max(12),
          notes: z.string().max(240).optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          bookingReference: z.string().optional(),
          status: bookingStatusSchema,
          hotelName: z.string().optional(),
          paymentModel: z.literal('pay_at_property'),
          summary: z.string(),
          operationsPhone: z.string().optional(),
        }),
      },
    },
    searchEvents: {
      title: 'Search events',
      description: 'Finds local events Brunch24 can help users discover or RSVP for.',
      input: {
        schema: z.object({
          city: z.string().max(80).optional(),
          area: z.string().max(80).optional(),
          date: z.string().max(40).optional(),
          vibe: z.string().max(80).optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          summary: z.string(),
          events: z.array(eventSchema),
          paymentModel: z.literal('pay_at_event_or_ticket_link'),
        }),
      },
    },
    requestEventRsvp: {
      title: 'Request event RSVP',
      description: 'Creates a Brunch24 RSVP request or ticket-interest handoff for manual follow-up.',
      input: {
        schema: z.object({
          eventId: z.string().min(2),
          attendeeName: z.string().min(2).max(120),
          attendeePhone: z.string().min(7).max(24),
          quantity: z.number().int().min(1).max(12),
          notes: z.string().max(240).optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          bookingReference: z.string().optional(),
          status: bookingStatusSchema,
          eventTitle: z.string().optional(),
          paymentModel: z.literal('pay_at_event_or_ticket_link'),
          summary: z.string(),
          operationsPhone: z.string().optional(),
        }),
      },
    },
    onboardVendor: {
      title: 'Onboard vendor',
      description: 'Collects a new vendor lead for Brunch24 directory onboarding.',
      input: {
        schema: z.object({
          businessName: z.string().min(2).max(120),
          ownerName: z.string().min(2).max(120),
          phone: z.string().min(7).max(24),
          whatsappNumber: z.string().min(7).max(24),
          category: z.enum(['food', 'hotel', 'event', 'service']),
          city: z.string().min(2).max(80),
          area: z.string().min(2).max(80),
          description: z.string().max(240).optional(),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          leadReference: z.string(),
          summary: z.string(),
          nextStep: z.string(),
        }),
      },
    },
    requestFeaturedPlacement: {
      title: 'Request featured placement',
      description: 'Captures interest in Brunch24 promoted listings for manual sales follow-up.',
      input: {
        schema: z.object({
          businessName: z.string().min(2).max(120),
          contactName: z.string().min(2).max(120),
          phone: z.string().min(7).max(24),
          category: z.string().min(2).max(80),
          city: z.string().min(2).max(80),
          durationWeeks: z.number().int().min(1).max(12),
        }),
      },
      output: {
        schema: z.object({
          ok: z.boolean(),
          promoReference: z.string(),
          rateNgn: z.number().int().positive(),
          summary: z.string(),
          nextStep: z.string(),
        }),
      },
    },
  },
})
