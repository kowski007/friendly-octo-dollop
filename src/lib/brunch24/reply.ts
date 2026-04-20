import { brunch24SamplePrompts, events, foodVendors, hotels } from "./mockData";

export type Brunch24Card = {
  id: string;
  title: string;
  meta: string;
  description: string;
};

export type Brunch24Reply = {
  reply: string;
  suggestions: string[];
  cards?: Brunch24Card[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function titleIncludes(title: string, query: string) {
  return normalize(title).includes(normalize(query));
}

function includesAny(message: string, tokens: string[]) {
  const normalized = normalize(message);
  return tokens.some((token) => normalized.includes(token));
}

function extractPartySize(message: string) {
  const match = /\bfor\s+(\d{1,2})\b/i.exec(message) || /\b(\d{1,2})\s+people\b/i.exec(message);
  return match?.[1] ?? null;
}

function extractBudget(message: string) {
  const compact = /\b(?:under|budget(?: of)?|max(?:imum)? of?)\s*[₦N]?\s*([\d,]+)/i.exec(message);
  if (!compact?.[1]) return null;
  return Number(compact[1].replace(/,/g, ""));
}

function extractDateHint(message: string) {
  const match = /\b(today|tomorrow|tonight|friday|saturday|sunday|monday|tuesday|wednesday|thursday|this weekend)\b/i.exec(
    message
  );
  return match?.[1] ?? "your selected date";
}

function extractTimeHint(message: string) {
  const match = /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\b/i.exec(message);
  return match?.[1] ?? "your preferred time";
}

function findArea(message: string) {
  const areas = [
    "lekki",
    "victoria island",
    "vi",
    "bodija",
    "wuse 2",
    "abuja",
    "ibadan",
    "lagos",
  ];

  const hit = areas.find((area) => normalize(message).includes(area));
  if (!hit) return null;
  if (hit === "vi") return "Victoria Island";
  return hit
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(amount: number) {
  return `NGN ${amount.toLocaleString("en-NG")}`;
}

function searchFood(message: string): Brunch24Reply {
  const area = findArea(message);
  const budget = extractBudget(message);

  const matches = foodVendors
    .filter((vendor) => {
      const areaMatch = !area || vendor.area === area || vendor.city === area;
      const budgetMatch = !budget || vendor.averageSpendNgn <= budget;
      return areaMatch && budgetMatch;
    })
    .slice(0, 3);

  if (matches.length === 0) {
    return {
      reply:
        "I do not have a seed listing that matches that exact food search yet, but Brunch24 can still take a manual sourcing request and follow up with the venue by WhatsApp.",
      suggestions: [
        "Find dinner spots in Lekki",
        "Book a table for 2 on Saturday",
        "Plan my evening in Victoria Island",
      ],
    };
  }

  return {
    reply:
      "Here are a few Brunch24 V1 food options. Reservations are call-to-confirm, and payment happens directly at the venue.",
    suggestions: [
      "Book a table for 2 in Lekki on Saturday at 7pm",
      "Show me hotels nearby",
      "What events are happening this weekend?",
    ],
    cards: matches.map((vendor) => ({
      id: vendor.id,
      title: vendor.name,
      meta: `${vendor.area}, ${vendor.city} | ${vendor.cuisine} | ${formatCurrency(vendor.averageSpendNgn)} avg`,
      description: vendor.shortDescription,
    })),
  };
}

function searchHotels(message: string): Brunch24Reply {
  const area = findArea(message);
  const budget = extractBudget(message);

  const matches = hotels
    .filter((hotel) => {
      const areaMatch = !area || hotel.area === area || hotel.city === area;
      const budgetMatch = !budget || hotel.nightlyRateNgn <= budget;
      return areaMatch && budgetMatch;
    })
    .slice(0, 3);

  return {
    reply:
      matches.length > 0
        ? "Here are hotel options Brunch24 can send as enquiry-first booking requests. Payment is handled at the property."
        : "I do not have a hotel seed listing for that exact filter yet, but I can still queue a manual hotel enquiry.",
    suggestions: [
      "Find hotels in Victoria Island under 120000",
      "Book a hotel in Lekki for tomorrow",
      "What events are happening nearby?",
    ],
    cards: matches.map((hotel) => ({
      id: hotel.id,
      title: hotel.name,
      meta: `${hotel.area}, ${hotel.city} | ${hotel.ratingLabel} | ${formatCurrency(hotel.nightlyRateNgn)}/night`,
      description: hotel.shortDescription,
    })),
  };
}

function searchEvents(message: string): Brunch24Reply {
  const area = findArea(message);

  const matches = events
    .filter((event) => !area || event.area === area || event.city === area)
    .slice(0, 3);

  return {
    reply:
      matches.length > 0
        ? "These are event options Brunch24 can help you discover or RSVP for in V1."
        : "I do not have a matching event seed listing yet, but I can still take a manual event sourcing request.",
    suggestions: [
      "RSVP me for an event this weekend",
      "Plan my evening in Lekki",
      "Find food spots nearby",
    ],
    cards: matches.map((event) => ({
      id: event.id,
      title: event.title,
      meta: `${event.area}, ${event.city} | ${event.date} | ${event.ticketType}`,
      description:
        event.ticketPriceNgn > 0
          ? `${event.shortDescription} Ticket from ${formatCurrency(event.ticketPriceNgn)}.`
          : `${event.shortDescription} Free RSVP.`,
    })),
  };
}

function makeBookingReply(message: string): Brunch24Reply {
  const matchedVendor = foodVendors.find((vendor) => titleIncludes(message, vendor.name));
  const partySize = extractPartySize(message) ?? "2";
  const date = extractDateHint(message);
  const time = extractTimeHint(message);

  if (matchedVendor) {
    return {
      reply: `Reservation request queued for ${matchedVendor.name}: ${partySize} guest(s), ${date}, ${time}. Brunch24 V1 will confirm manually with the restaurant, and payment happens at the venue directly.`,
      suggestions: [
        "Plan my evening around this booking",
        "Show me hotels nearby",
        "Find another restaurant",
      ],
      cards: [
        {
          id: matchedVendor.id,
          title: matchedVendor.name,
          meta: `${matchedVendor.area}, ${matchedVendor.city} | call-to-confirm`,
          description: matchedVendor.trustNote,
        },
      ],
    };
  }

  return {
    reply: `I can queue that reservation as a manual sourcing request for ${partySize} guest(s), ${date}, ${time}. Since Brunch24 V1 is call-to-confirm, the ops team would message the venue and then send the confirmation back to the customer.`,
    suggestions: [
      "Find dinner spots in Lekki",
      "Plan my evening in Lagos",
      "Find events this weekend",
    ],
  };
}

function makeVendorReply(): Brunch24Reply {
  return {
    reply:
      "Brunch24 can onboard the business as a free listing first, then upsell featured placement at NGN 2,000 per week. For V1, the ops team would verify the vendor details manually on WhatsApp.",
    suggestions: [
      "List my restaurant on Brunch24",
      "How does featured placement work?",
      "Find restaurants in Lekki",
    ],
  };
}

function makeFeaturedReply(): Brunch24Reply {
  return {
    reply:
      "Featured placement in Brunch24 V1 is a manual promo workflow. The current launch pricing is NGN 2,000 per week for promo listings, with confirmation handled off-chat.",
    suggestions: [
      "List my business on Brunch24",
      "Find restaurants in Lagos",
      "Show me event options",
    ],
  };
}

function makePlanReply(message: string): Brunch24Reply {
  const area = findArea(message) ?? "Lekki";
  const budget = extractBudget(message) ?? 30000;
  const dinnerSpot =
    foodVendors.find((vendor) => vendor.area === area) ?? foodVendors[0];
  const event =
    events.find((listing) => listing.area === area || listing.city === area) ?? events[0];

  return {
    reply: `Here is a fast Brunch24 evening plan for ${area}: dinner at ${dinnerSpot.name}, then ${event.title}. Estimated spend is about ${formatCurrency(
      Math.min(budget, dinnerSpot.averageSpendNgn * 2 + event.ticketPriceNgn * 2)
    )} for two people. In V1, I can queue the dinner reservation and RSVP request, then the ops team confirms both manually.`,
    suggestions: [
      "Book that dinner plan",
      "Show me hotels nearby",
      "Find a cheaper option",
    ],
    cards: [
      {
        id: dinnerSpot.id,
        title: dinnerSpot.name,
        meta: `${dinnerSpot.area}, ${dinnerSpot.city} | dinner stop`,
        description: dinnerSpot.shortDescription,
      },
      {
        id: event.id,
        title: event.title,
        meta: `${event.area}, ${event.city} | after-dinner option`,
        description: event.shortDescription,
      },
    ],
  };
}

export function getBrunch24Reply(message: string): Brunch24Reply {
  const trimmed = message.trim();
  const normalized = normalize(trimmed);

  if (!trimmed) {
    return {
      reply:
        "Send a Brunch24 request like food discovery, table booking, hotel search, event search, or vendor onboarding.",
      suggestions: brunch24SamplePrompts.slice(0, 3),
    };
  }

  if (includesAny(normalized, ["hi", "hello", "hey"]) && normalized.length < 20) {
    return {
      reply:
        "I am Brunch24's local V1 tester. I can help with food discovery, restaurant booking requests, hotel enquiries, event discovery, and vendor onboarding. Payments are not processed in-app; they happen directly at the venue or property.",
      suggestions: brunch24SamplePrompts.slice(0, 4),
    };
  }

  if (includesAny(normalized, ["plan my evening", "plan my night", "fun friday", "date night"])) {
    return makePlanReply(trimmed);
  }

  if (includesAny(normalized, ["featured", "promo listing", "promote my business"])) {
    return makeFeaturedReply();
  }

  if (includesAny(normalized, ["list my business", "list my restaurant", "onboard vendor", "add my hotel"])) {
    return makeVendorReply();
  }

  if (
    includesAny(normalized, ["book", "reserve", "reservation", "table for", "book a table"]) &&
    !includesAny(normalized, ["hotel", "room"])
  ) {
    return makeBookingReply(trimmed);
  }

  if (includesAny(normalized, ["hotel", "stay", "room"])) {
    return searchHotels(trimmed);
  }

  if (includesAny(normalized, ["event", "rsvp", "party", "concert", "weekend"])) {
    return searchEvents(trimmed);
  }

  if (includesAny(normalized, ["food", "restaurant", "dinner", "lunch", "brunch", "pepper soup"])) {
    return searchFood(trimmed);
  }

  return {
    reply:
      "I can help with Brunch24 V1 flows: find food spots, queue a restaurant reservation, search hotels, find events, plan an evening, or onboard a vendor. Everything is discovery-first and manually confirmed after the request.",
    suggestions: brunch24SamplePrompts.slice(0, 4),
  };
}
