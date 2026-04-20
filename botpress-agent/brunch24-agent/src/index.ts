import * as bp from '.botpress'
import { events, foodVendors, hotels } from './catalog'

function normalize(value?: string) {
  return (value || '').trim().toLowerCase()
}

function includesFilter(...values: Array<string | undefined>) {
  const haystack = values.map((value) => normalize(value)).join(' ')
  return (needle?: string) => !needle || haystack.includes(normalize(needle))
}

function matchesBudget(amount: number, budget?: 'budget' | 'midrange' | 'premium') {
  if (!budget) return true
  if (budget === 'budget') return amount <= 6000
  if (budget === 'midrange') return amount > 6000 && amount <= 10000
  return amount > 10000
}

function reference(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `B24-${prefix}-${stamp}${random}`
}

function operationsPhone() {
  return process.env.BRUNCH24_OPERATIONS_PHONE || undefined
}

const bot = new bp.Bot({
  actions: {
    searchFoodVendors: async (args: any) => {
      const input = args?.input as {
        query?: string
        city?: string
        area?: string
        cuisine?: string
        budget?: 'budget' | 'midrange' | 'premium'
      }

      const results = foodVendors.filter((vendor) => {
        const matchesText = includesFilter(vendor.name, vendor.city, vendor.area, vendor.cuisine, vendor.shortDescription)
        return (
          matchesText(input.query) &&
          matchesText(input.city) &&
          matchesText(input.area) &&
          matchesText(input.cuisine) &&
          matchesBudget(vendor.averageSpendNgn, input.budget)
        )
      })

      const vendors = results.slice(0, 5)
      const summary =
        vendors.length > 0
          ? `Found ${vendors.length} food option${vendors.length === 1 ? '' : 's'} for Brunch24 V1. Reservations are request-only and payment happens at the venue.`
          : 'No seed listings matched that search yet. Brunch24 can still take a manual sourcing request.'

      return { ok: true, summary, vendors, paymentModel: 'pay_at_venue' as const }
    },

    requestTableBooking: async (args: any) => {
      const input = args?.input as {
        vendorId: string
        customerName: string
        customerPhone: string
        partySize: number
        date: string
        time: string
        occasion?: string
        notes?: string
      }

      const restaurant = foodVendors.find((vendor) => vendor.id === input.vendorId)
      const bookingReference = reference('TBL')
      const summary = restaurant
        ? `Reservation request queued for ${restaurant.name}: ${input.partySize} guest(s) on ${input.date} at ${input.time}. Brunch24 will confirm manually with the venue.`
        : 'Reservation request queued. Brunch24 will manually source and confirm the venue.'

      return {
        ok: true,
        bookingReference,
        status: 'manual_confirmation_required' as const,
        restaurantName: restaurant?.name,
        paymentModel: 'pay_at_venue' as const,
        summary,
        operationsPhone: operationsPhone(),
      }
    },

    searchHotels: async (args: any) => {
      const input = args?.input as {
        city?: string
        area?: string
        maxNightlyRateNgn?: number
      }

      const results = hotels.filter((hotel) => {
        const matchesText = includesFilter(hotel.name, hotel.city, hotel.area, hotel.shortDescription)
        const withinRate = !input.maxNightlyRateNgn || hotel.nightlyRateNgn <= input.maxNightlyRateNgn
        return matchesText(input.city) && matchesText(input.area) && withinRate
      })

      const listings = results.slice(0, 5)
      const summary =
        listings.length > 0
          ? `Found ${listings.length} hotel option${listings.length === 1 ? '' : 's'} for enquiry-first booking. Payment is handled directly at the property.`
          : 'No seed hotel listings matched that filter yet. Brunch24 can still submit a manual hotel enquiry.'

      return { ok: true, summary, hotels: listings, paymentModel: 'pay_at_property' as const }
    },

    requestHotelBooking: async (args: any) => {
      const input = args?.input as {
        hotelId: string
        guestName: string
        guestPhone: string
        checkIn: string
        checkOut: string
        rooms: number
        guests: number
      }

      const hotel = hotels.find((listing) => listing.id === input.hotelId)
      const bookingReference = reference('HTL')
      const summary = hotel
        ? `Hotel enquiry queued for ${hotel.name}: ${input.rooms} room(s), ${input.guests} guest(s), ${input.checkIn} to ${input.checkOut}. Brunch24 will confirm availability manually.`
        : 'Hotel enquiry queued. Brunch24 will manually confirm room availability and next steps.'

      return {
        ok: true,
        bookingReference,
        status: 'manual_confirmation_required' as const,
        hotelName: hotel?.name,
        paymentModel: 'pay_at_property' as const,
        summary,
        operationsPhone: operationsPhone(),
      }
    },

    searchEvents: async (args: any) => {
      const input = args?.input as {
        city?: string
        area?: string
        date?: string
        vibe?: string
      }

      const results = events.filter((event) => {
        const matchesText = includesFilter(event.title, event.city, event.area, event.shortDescription)
        return matchesText(input.city) && matchesText(input.area) && matchesText(input.date) && matchesText(input.vibe)
      })

      const listings = results.slice(0, 5)
      const summary =
        listings.length > 0
          ? `Found ${listings.length} event option${listings.length === 1 ? '' : 's'} Brunch24 can help you RSVP for.`
          : 'No seed events matched that search yet, but Brunch24 can still take a manual event sourcing request.'

      return { ok: true, summary, events: listings, paymentModel: 'pay_at_event_or_ticket_link' as const }
    },

    requestEventRsvp: async (args: any) => {
      const input = args?.input as {
        eventId: string
        attendeeName: string
        attendeePhone: string
        quantity: number
      }

      const event = events.find((listing) => listing.id === input.eventId)
      const bookingReference = reference('EVT')
      const summary = event
        ? `RSVP request queued for ${event.title} for ${input.quantity} attendee(s). Brunch24 will confirm the final access path manually.`
        : 'Event RSVP request queued. Brunch24 will manually confirm access details.'

      return {
        ok: true,
        bookingReference,
        status: 'manual_confirmation_required' as const,
        eventTitle: event?.title,
        paymentModel: 'pay_at_event_or_ticket_link' as const,
        summary,
        operationsPhone: operationsPhone(),
      }
    },

    onboardVendor: async (args: any) => {
      const input = args?.input as {
        businessName: string
        ownerName: string
        phone: string
        whatsappNumber: string
        category: 'food' | 'hotel' | 'event' | 'service'
        city: string
        area: string
      }

      const leadReference = reference('VND')
      return {
        ok: true,
        leadReference,
        summary: `Vendor lead captured for ${input.businessName} in ${input.area}, ${input.city}.`,
        nextStep: 'Brunch24 ops should review the lead, verify the listing, and follow up on WhatsApp.',
      }
    },

    requestFeaturedPlacement: async (args: any) => {
      const input = args?.input as {
        businessName: string
        contactName: string
        phone: string
        category: string
        city: string
        durationWeeks: number
      }

      const promoReference = reference('PRM')
      const rateNgn = input.durationWeeks * 2000

      return {
        ok: true,
        promoReference,
        rateNgn,
        summary: `Featured placement request captured for ${input.businessName} in ${input.city}. Estimated rate: NGN ${rateNgn}.`,
        nextStep: 'Brunch24 sales should confirm slot availability and send bank transfer instructions manually.',
      }
    },
  },
})

export default bot
