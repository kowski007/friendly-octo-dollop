export type FoodVendor = {
  id: string
  name: string
  city: string
  area: string
  cuisine: string
  averageSpendNgn: number
  trustNote: string
  shortDescription: string
}

export type HotelListing = {
  id: string
  name: string
  city: string
  area: string
  nightlyRateNgn: number
  ratingLabel: string
  shortDescription: string
}

export type EventListing = {
  id: string
  title: string
  city: string
  area: string
  date: string
  ticketType: string
  ticketPriceNgn: number
  shortDescription: string
}

export const foodVendors: FoodVendor[] = [
  {
    id: 'food_lekki_brunch_house',
    name: 'Lekki Brunch House',
    city: 'Lagos',
    area: 'Lekki',
    cuisine: 'Brunch and continental',
    averageSpendNgn: 9000,
    trustNote: 'Seed listing for Brunch24 demo. Manual confirmation required.',
    shortDescription: 'Bright all-day dining spot for brunch, coffee, and casual dinner plans.',
  },
  {
    id: 'food_island_pepper_grill',
    name: 'Island Pepper Grill',
    city: 'Lagos',
    area: 'Victoria Island',
    cuisine: 'Nigerian grills',
    averageSpendNgn: 7000,
    trustNote: 'Seed listing for Brunch24 demo. Manual confirmation required.',
    shortDescription: 'Popular for suya platters, pepper soup, and after-work group bookings.',
  },
  {
    id: 'food_bodija_bowl_spot',
    name: 'Bodija Bowl Spot',
    city: 'Ibadan',
    area: 'Bodija',
    cuisine: 'Local Nigerian meals',
    averageSpendNgn: 4500,
    trustNote: 'Seed listing for Brunch24 demo. Manual confirmation required.',
    shortDescription: 'Comfort-food kitchen with rice bowls, soups, and family-size trays.',
  },
  {
    id: 'food_abuja_garden_table',
    name: 'Abuja Garden Table',
    city: 'Abuja',
    area: 'Wuse 2',
    cuisine: 'Fusion and cocktails',
    averageSpendNgn: 12000,
    trustNote: 'Seed listing for Brunch24 demo. Manual confirmation required.',
    shortDescription: 'Date-night friendly restaurant with outdoor seating and live acoustic sets.',
  },
]

export const hotels: HotelListing[] = [
  {
    id: 'hotel_maple_crest_lekki',
    name: 'Maple Crest Hotel',
    city: 'Lagos',
    area: 'Lekki Phase 1',
    nightlyRateNgn: 85000,
    ratingLabel: 'Business-friendly',
    shortDescription: 'Modern boutique hotel close to restaurants and nightlife in Lekki.',
  },
  {
    id: 'hotel_vi_harbor_suites',
    name: 'VI Harbor Suites',
    city: 'Lagos',
    area: 'Victoria Island',
    nightlyRateNgn: 110000,
    ratingLabel: 'Premium stay',
    shortDescription: 'Upscale hotel for short city stays, client visits, and weekend getaways.',
  },
  {
    id: 'hotel_bodija_grand_suites',
    name: 'Bodija Grand Suites',
    city: 'Ibadan',
    area: 'Bodija',
    nightlyRateNgn: 55000,
    ratingLabel: 'Value stay',
    shortDescription: 'Comfortable midrange hotel with breakfast and meeting-room options.',
  },
]

export const events: EventListing[] = [
  {
    id: 'event_lekki_rooftop_brunch',
    title: 'Lekki Rooftop Brunch Social',
    city: 'Lagos',
    area: 'Lekki',
    date: '2026-04-25',
    ticketType: 'RSVP + pay at door',
    ticketPriceNgn: 10000,
    shortDescription: 'Daytime social with DJs, small plates, and networking-friendly seating.',
  },
  {
    id: 'event_vi_afterwork_live',
    title: 'VI Afterwork Live',
    city: 'Lagos',
    area: 'Victoria Island',
    date: '2026-04-24',
    ticketType: 'Ticket link on confirmation',
    ticketPriceNgn: 15000,
    shortDescription: 'Live music, cocktails, and a relaxed after-work crowd by the waterfront.',
  },
  {
    id: 'event_ibadan_food_fair',
    title: 'Ibadan Food Fair Saturday',
    city: 'Ibadan',
    area: 'Jericho',
    date: '2026-05-02',
    ticketType: 'Free RSVP',
    ticketPriceNgn: 0,
    shortDescription: 'Family-friendly food market with tasting stands and local vendors.',
  },
]
