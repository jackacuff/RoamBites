import {
  db,
  trucksTable,
  scheduleEntriesTable,
  truckSpecialsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

// OKC-area coordinates for realistic locations
const OKC_SPOTS = [
  { name: "Scissortail Park", lat: 35.4620, lng: -97.5145, address: "300 SW 7th St", city: "Oklahoma City" },
  { name: "Midtown OKC", lat: 35.4796, lng: -97.5271, address: "1015 N Hudson Ave", city: "Oklahoma City" },
  { name: "Bricktown", lat: 35.4660, lng: -97.5084, address: "201 E Sheridan Ave", city: "Oklahoma City" },
  { name: "Edmond Mitch Park", lat: 35.6669, lng: -97.4858, address: "1501 W Edmond Rd", city: "Edmond" },
  { name: "Norman Campus", lat: 35.2059, lng: -97.4449, address: "University Blvd & W Boyd St", city: "Norman" },
  { name: "Yukon City Park", lat: 35.5067, lng: -97.7629, address: "301 Elm Ave", city: "Yukon" },
  { name: "Penn Square Area", lat: 35.5314, lng: -97.5662, address: "1901 NW Expressway", city: "Oklahoma City" },
  { name: "Automobile Alley", lat: 35.4823, lng: -97.5193, address: "700 N Broadway Ave", city: "Oklahoma City" },
  { name: "Paseo Arts District", lat: 35.4956, lng: -97.5326, address: "3000 Paseo Dr", city: "Oklahoma City" },
  { name: "Moore Central Park", lat: 35.3395, lng: -97.4867, address: "501 SW 4th St", city: "Moore" },
];

// Future schedule slots — rotating across the next 3 weeks
function futureDate(daysAhead: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  // ── 1. Fetch trucks ──────────────────────────────────────────────────────────
  const trucks = await db
    .select({ id: trucksTable.id, slug: trucksTable.slug })
    .from(trucksTable)
    .orderBy(trucksTable.id);

  const bySlug = Object.fromEntries(trucks.map((t) => [t.slug, t.id]));

  console.log(`Found ${trucks.length} trucks: ${trucks.map((t) => t.slug).join(", ")}`);

  // ── 2. Enrich truck profiles ─────────────────────────────────────────────────
  const profiles: Record<string, {
    phone?: string;
    website?: string;
    instagramHandle?: string;
    twitterHandle?: string;
    tiktokHandle?: string;
    facebookUrl?: string;
    currentLatitude?: number;
    currentLongitude?: number;
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
    isLive?: boolean;
    isApproved?: boolean;
  }> = {
    "red-dirt-tacos": {
      phone: "(405) 555-0142",
      website: "https://redditttacos.com",
      instagramHandle: "redditttacos",
      twitterHandle: "RedDirtTacos",
      tiktokHandle: "redditttacos",
      currentLatitude: OKC_SPOTS[0]!.lat,
      currentLongitude: OKC_SPOTS[0]!.lng,
      primaryColor: "#B91C1C",
      secondaryColor: "#78350F",
      tagline: "Oklahoma flavor, one taco at a time.",
      isLive: true,
      isApproved: true,
    },
    "prairie-smoke-bbq": {
      phone: "(405) 555-0287",
      website: "https://prairiesmokebbq.com",
      instagramHandle: "prairiesmokebbq",
      twitterHandle: "PrairieSmokeOKC",
      tiktokHandle: "prairiesmokebbq",
      currentLatitude: OKC_SPOTS[1]!.lat,
      currentLongitude: OKC_SPOTS[1]!.lng,
      primaryColor: "#92400E",
      secondaryColor: "#1C1917",
      tagline: "Low, slow & proud of it.",
      isLive: true,
      isApproved: true,
    },
    "okie-roast-coffee": {
      phone: "(405) 555-0374",
      website: "https://okieroastcoffee.com",
      instagramHandle: "okieroastcoffee",
      twitterHandle: "OkieRoastCoffee",
      tiktokHandle: "okieroast",
      currentLatitude: OKC_SPOTS[2]!.lat,
      currentLongitude: OKC_SPOTS[2]!.lng,
      primaryColor: "#1D4ED8",
      secondaryColor: "#F5F0E8",
      tagline: "Your morning ritual, on the move.",
      isLive: true,
      isApproved: true,
    },
    "route-66-burgers": {
      phone: "(405) 555-0451",
      website: "https://route66burgers.com",
      instagramHandle: "route66burgers",
      twitterHandle: "Route66BurgersOKC",
      tiktokHandle: "route66burgers",
      currentLatitude: OKC_SPOTS[3]!.lat,
      currentLongitude: OKC_SPOTS[3]!.lng,
      primaryColor: "#DC2626",
      secondaryColor: "#FCD34D",
      tagline: "Built for the road. Made to smash.",
      isLive: true,
      isApproved: true,
    },
    "big-friendly-pizza": {
      phone: "(405) 555-0568",
      website: "https://bigfriendlypizza.com",
      instagramHandle: "bigfriendlypizzaokc",
      twitterHandle: "BigFriendlyPizza",
      tiktokHandle: "bigfriendlypizza",
      currentLatitude: OKC_SPOTS[4]!.lat,
      currentLongitude: OKC_SPOTS[4]!.lng,
      primaryColor: "#16A34A",
      secondaryColor: "#DC2626",
      tagline: "Wood-fired. Oklahoma-proud.",
      isLive: true,
      isApproved: true,
    },
    "hometown-sno-cones": {
      phone: "(405) 555-0629",
      website: "https://hometownsnocones.com",
      instagramHandle: "hometownsnocones",
      twitterHandle: "HometownSno",
      tiktokHandle: "hometownsnocones",
      currentLatitude: OKC_SPOTS[5]!.lat,
      currentLongitude: OKC_SPOTS[5]!.lng,
      primaryColor: "#7C3AED",
      secondaryColor: "#EC4899",
      tagline: "50+ flavors of Oklahoma summer.",
      isLive: true,
      isApproved: true,
    },
    "seoul-wagon": {
      phone: "(405) 555-0713",
      website: "https://seoulwagonokc.com",
      instagramHandle: "seoulwagonokc",
      twitterHandle: "SeoulWagonOKC",
      tiktokHandle: "seoulwagon",
      currentLatitude: OKC_SPOTS[6]!.lat,
      currentLongitude: OKC_SPOTS[6]!.lng,
      primaryColor: "#0F172A",
      secondaryColor: "#EF4444",
      tagline: "Bold Korean flavors in the heart of the plains.",
      isLive: true,
      isApproved: true,
    },
    "boomtown-bites": {
      phone: "(405) 555-0834",
      website: "https://boomtownbites.com",
      instagramHandle: "boomtownbites",
      twitterHandle: "BoomtownBites",
      tiktokHandle: "boomtownbites",
      currentLatitude: OKC_SPOTS[7]!.lat,
      currentLongitude: OKC_SPOTS[7]!.lng,
      primaryColor: "#B45309",
      secondaryColor: "#064E3B",
      tagline: "Comfort food done the Oklahoma way.",
      isLive: true,
      isApproved: true,
    },
  };

  for (const [slug, data] of Object.entries(profiles)) {
    const id = bySlug[slug];
    if (!id) { console.warn(`  Skipping unknown slug: ${slug}`); continue; }
    await db.update(trucksTable).set(data).where(eq(trucksTable.id, id));
    console.log(`  ✓ Updated ${slug}`);
  }

  // ── 3. Clear old schedule entries + specials ──────────────────────────────────
  await db.delete(scheduleEntriesTable);
  await db.delete(truckSpecialsTable);
  console.log("Cleared old schedules and specials");

  // ── 4. Add schedule entries (2–3 upcoming stops per truck) ──────────────────
  const scheduleData = [
    // Red Dirt Tacos (id: bySlug["red-dirt-tacos"])
    { slug: "red-dirt-tacos", ...OKC_SPOTS[0]!, start: futureDate(1, 11), end: futureDate(1, 15) },
    { slug: "red-dirt-tacos", ...OKC_SPOTS[4]!, start: futureDate(4, 10), end: futureDate(4, 14) },
    { slug: "red-dirt-tacos", ...OKC_SPOTS[8]!, start: futureDate(9, 12), end: futureDate(9, 17) },

    // Prairie Smoke BBQ
    { slug: "prairie-smoke-bbq", ...OKC_SPOTS[1]!, start: futureDate(2, 11), end: futureDate(2, 16) },
    { slug: "prairie-smoke-bbq", ...OKC_SPOTS[6]!, start: futureDate(5, 11), end: futureDate(5, 15) },
    { slug: "prairie-smoke-bbq", ...OKC_SPOTS[9]!, start: futureDate(10, 12), end: futureDate(10, 18) },

    // Okie Roast Coffee
    { slug: "okie-roast-coffee", ...OKC_SPOTS[2]!, start: futureDate(1, 7), end: futureDate(1, 12) },
    { slug: "okie-roast-coffee", ...OKC_SPOTS[7]!, start: futureDate(3, 7), end: futureDate(3, 11) },
    { slug: "okie-roast-coffee", ...OKC_SPOTS[5]!, start: futureDate(8, 8), end: futureDate(8, 13) },

    // Route 66 Burgers
    { slug: "route-66-burgers", ...OKC_SPOTS[3]!, start: futureDate(2, 11), end: futureDate(2, 15) },
    { slug: "route-66-burgers", ...OKC_SPOTS[0]!, start: futureDate(6, 11), end: futureDate(6, 16) },
    { slug: "route-66-burgers", ...OKC_SPOTS[2]!, start: futureDate(11, 12), end: futureDate(11, 17) },

    // Big Friendly Pizza
    { slug: "big-friendly-pizza", ...OKC_SPOTS[4]!, start: futureDate(3, 17), end: futureDate(3, 21) },
    { slug: "big-friendly-pizza", ...OKC_SPOTS[1]!, start: futureDate(7, 17), end: futureDate(7, 21) },
    { slug: "big-friendly-pizza", ...OKC_SPOTS[6]!, start: futureDate(12, 18), end: futureDate(12, 22) },

    // Hometown Sno Cones
    { slug: "hometown-sno-cones", ...OKC_SPOTS[5]!, start: futureDate(1, 12), end: futureDate(1, 18) },
    { slug: "hometown-sno-cones", ...OKC_SPOTS[9]!, start: futureDate(5, 12), end: futureDate(5, 17) },
    { slug: "hometown-sno-cones", ...OKC_SPOTS[3]!, start: futureDate(8, 11), end: futureDate(8, 16) },

    // Seoul Wagon
    { slug: "seoul-wagon", ...OKC_SPOTS[6]!, start: futureDate(2, 11), end: futureDate(2, 16) },
    { slug: "seoul-wagon", ...OKC_SPOTS[8]!, start: futureDate(6, 11), end: futureDate(6, 15) },
    { slug: "seoul-wagon", ...OKC_SPOTS[0]!, start: futureDate(11, 12), end: futureDate(11, 17) },

    // Boomtown Bites
    { slug: "boomtown-bites", ...OKC_SPOTS[7]!, start: futureDate(1, 11), end: futureDate(1, 15) },
    { slug: "boomtown-bites", ...OKC_SPOTS[2]!, start: futureDate(4, 11), end: futureDate(4, 16) },
    { slug: "boomtown-bites", ...OKC_SPOTS[1]!, start: futureDate(9, 12), end: futureDate(9, 17) },
  ];

  await db.insert(scheduleEntriesTable).values(
    scheduleData.map((s) => ({
      truckId: bySlug[s.slug]!,
      venueName: s.name,
      address: s.address,
      city: s.city,
      latitude: s.lat,
      longitude: s.lng,
      startDateTime: s.start,
      endDateTime: s.end,
      isLive: false,
    }))
  );
  console.log(`Added ${scheduleData.length} schedule entries`);

  // ── 5. Add specials ───────────────────────────────────────────────────────────
  const expires30 = new Date(Date.now() + 30 * 86400000);
  const expires7 = new Date(Date.now() + 7 * 86400000);

  const specialsData = [
    // Red Dirt Tacos
    { slug: "red-dirt-tacos", title: "Taco Tuesday — $3 Tacos", body: "Every Tuesday — all tacos just $3! Mix and match brisket, al pastor, or chicken. While supplies last.", type: "deal", expiresAt: expires30 },
    { slug: "red-dirt-tacos", title: "New: Birria Tacos!", body: "Our slow-braised beef birria tacos are finally here. Served with consommé for dipping. Don't sleep on these.", type: "announcement", expiresAt: expires7 },

    // Prairie Smoke BBQ
    { slug: "prairie-smoke-bbq", title: "Weekend Brisket Special", body: "Full brisket plates all weekend — $17 includes two sides and a drink. Friday through Sunday only.", type: "deal", expiresAt: expires30 },
    { slug: "prairie-smoke-bbq", title: "Pitmaster's Choice Box", body: "New on the menu: the Pitmaster's Choice Box — a mix of everything we smoke that day. $24 feeds two.", type: "announcement", expiresAt: expires7 },

    // Okie Roast Coffee
    { slug: "okie-roast-coffee", title: "Happy Hour Cold Brew — $3", body: "Cold brew for just $3 every day from 2–4 PM. Beat the afternoon slump the right way.", type: "deal", expiresAt: expires30 },
    { slug: "okie-roast-coffee", title: "Summer Menu Is Here!", body: "Introducing our summer menu: Strawberry Matcha Latte, Mango Cold Brew, and new seasonal pastries.", type: "announcement", expiresAt: expires7 },

    // Route 66 Burgers
    { slug: "route-66-burgers", title: "Double-Down Wednesday", body: "Every Wednesday: buy any burger, get a second patty free. The smashiest deal in OKC.", type: "deal", expiresAt: expires30 },
    { slug: "route-66-burgers", title: "New Spicy Green Chile Burger", body: "New Hatch Green Chile Smash Burger is now on the menu. Roasted Hatch chiles, pepper jack, and chipotle aioli.", type: "announcement", expiresAt: expires7 },

    // Big Friendly Pizza
    { slug: "big-friendly-pizza", title: "Friday Night Pizza + Drink — $20", body: "Any full pizza + a 16oz drink for $20 every Friday evening. Wood-fired and ready in minutes.", type: "deal", expiresAt: expires30 },
    { slug: "big-friendly-pizza", title: "New: White Truffle Pizza", body: "Weekend special: White Truffle Mushroom pizza with fontina, roasted garlic, and fresh thyme. $18 while it lasts.", type: "announcement", expiresAt: expires7 },

    // Hometown Sno Cones
    { slug: "hometown-sno-cones", title: "Summer Loyalty Card — Buy 9 Get 1 Free", body: "Pick up your loyalty punch card! Buy 9 snowballs and your 10th is on us. Ask at the window.", type: "announcement", expiresAt: expires30 },
    { slug: "hometown-sno-cones", title: "New: Mango Chamoy Snowball", body: "Oklahoma meets Mexico City — our new Mango Chamoy snowball with tajín rim is insane. Try it today.", type: "announcement", expiresAt: expires7 },

    // Seoul Wagon
    { slug: "seoul-wagon", title: "Korean Street Taco Deal — 4 for $15", body: "Any four Korean BBQ tacos for $15. Mix bulgogi, spicy pork, or tofu. Lunch special Mon–Fri.", type: "deal", expiresAt: expires30 },
    { slug: "seoul-wagon", title: "New: Japchae Noodle Bowl", body: "Glass noodles, sesame, mushrooms, spinach, and your choice of protein. New on the menu and selling fast.", type: "announcement", expiresAt: expires7 },

    // Boomtown Bites
    { slug: "boomtown-bites", title: "Comfort Combo — $13", body: "Chicken tender plate + mac & cheese + sweet tea for $13. The comfort combo. Available daily.", type: "deal", expiresAt: expires30 },
    { slug: "boomtown-bites", title: "New: Smothered Biscuits & Gravy", body: "Breakfast item available weekend mornings! Housemade biscuits, sausage gravy, and a fried egg on top.", type: "announcement", expiresAt: expires7 },
  ];

  await db.insert(truckSpecialsTable).values(
    specialsData.map((s) => ({
      truckId: bySlug[s.slug]!,
      title: s.title,
      body: s.body,
      type: s.type,
      isActive: true,
      expiresAt: s.expiresAt,
    }))
  );
  console.log(`Added ${specialsData.length} specials`);

  console.log("\nDone! All trucks enriched with full profiles, schedules, and specials.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
