import { db, usersTable, spotListingsTable, spotListingSchedulesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function seedSpots() {
  const admins = await db.select({ id: usersTable.id }).from(usersTable)
    .where(sql`${usersTable.role} IN ('admin','superadmin')`).limit(1);
  if (!admins.length) { console.log("No admin user found"); return; }
  const hostId = admins[0].id;

  const existing = await db.select({ count: sql<number>`count(*)` }).from(spotListingsTable);
  if (Number(existing[0]?.count) > 0) { console.log("Spot listings already seeded"); return; }

  const listings = await db.insert(spotListingsTable).values([
    {
      hostUserId: hostId,
      title: "Bricktown Food Truck Row",
      description: "Prime location in the heart of Bricktown with heavy foot traffic. Power hookups and water access available.",
      hostName: "Bricktown Properties",
      address: "101 E Sheridan Ave",
      city: "Oklahoma City",
      latitude: 35.4671,
      longitude: -97.5017,
      spotType: "truck_park",
      spotsTotal: 6,
      spotsAvailable: 4,
      priceInCents: 7500,
      isInstantBook: false,
      hasWaitlist: true,
      scheduleType: "recurring",
      amenities: ["Power hookup", "Water access", "High traffic", "Restrooms"],
    },
    {
      hostUserId: hostId,
      title: "Midtown Parking Lot — Weekends Only",
      description: "Open lot with easy access off Western Ave. Great spot for lunch-hour and weekend crowds. One truck at a time.",
      hostName: "Midtown Realty Group",
      address: "3109 N Western Ave",
      city: "Oklahoma City",
      latitude: 35.5119,
      longitude: -97.5667,
      spotType: "single_spot",
      spotsTotal: 1,
      spotsAvailable: 1,
      priceInCents: 3500,
      isInstantBook: true,
      hasWaitlist: false,
      scheduleType: "recurring",
      amenities: ["High traffic", "Parking"],
    },
    {
      hostUserId: hostId,
      title: "Farmers Market Vendor Space",
      description: "Join our weekly farmers market every Saturday morning. Space for up to 3 food trucks alongside produce and craft vendors.",
      hostName: "OKC Farmers Market",
      address: "311 S Klein Ave",
      city: "Oklahoma City",
      latitude: 35.4654,
      longitude: -97.5157,
      spotType: "recurring_host",
      spotsTotal: 3,
      spotsAvailable: 2,
      priceInCents: 5000,
      isInstantBook: false,
      hasWaitlist: true,
      scheduleType: "recurring",
      amenities: ["High traffic", "Restrooms", "Water access"],
    },
    {
      hostUserId: hostId,
      title: "Pop-Up at Scissortail Park",
      description: "One-time pop-up opportunity for the Park District summer concert series. Expect 2,000+ attendees. Application required.",
      hostName: "OKC Parks & Recreation",
      address: "300 SW 7th St",
      city: "Oklahoma City",
      latitude: 35.4618,
      longitude: -97.5136,
      spotType: "popup_opportunity",
      spotsTotal: 4,
      spotsAvailable: 4,
      priceInCents: 15000,
      isInstantBook: false,
      hasWaitlist: false,
      scheduleType: "one_time",
      amenities: ["High traffic", "Restrooms", "Power hookup"],
      requirements: "Must have valid health permit and be self-contained. No generators.",
    },
    {
      hostUserId: hostId,
      title: "Edmond Brewery Thursdays",
      description: "Local craft brewery inviting food trucks every Thursday evening 5–9pm. We handle promotion, you bring the food.",
      hostName: "Edmond Brewing Co.",
      address: "124 S Broadway",
      city: "Edmond",
      latitude: 35.6520,
      longitude: -97.4781,
      spotType: "recurring_host",
      spotsTotal: 2,
      spotsAvailable: 2,
      priceInCents: 0,
      isInstantBook: true,
      hasWaitlist: false,
      scheduleType: "recurring",
      amenities: ["High traffic", "Covered area"],
    },
    {
      hostUserId: hostId,
      title: "Plaza District Parking Spots",
      description: "Busy arts district spot with great foot traffic for lunch and dinner. Multiple spaces available monthly.",
      hostName: "Plaza Arts Center",
      address: "1703 NW 16th St",
      city: "Oklahoma City",
      latitude: 35.5088,
      longitude: -97.5286,
      spotType: "truck_park",
      spotsTotal: 4,
      spotsAvailable: 3,
      priceInCents: 5000,
      isInstantBook: false,
      hasWaitlist: true,
      scheduleType: "recurring",
      amenities: ["High traffic", "Parking"],
    },
  ]).returning({ id: spotListingsTable.id, scheduleType: spotListingsTable.scheduleType });

  for (const l of listings) {
    if (l.scheduleType === "recurring") {
      await db.insert(spotListingSchedulesTable).values([
        { listingId: l.id, dayOfWeek: 4, startTime: "17:00", endTime: "21:00" },
        { listingId: l.id, dayOfWeek: 5, startTime: "11:00", endTime: "21:00" },
        { listingId: l.id, dayOfWeek: 6, startTime: "10:00", endTime: "22:00" },
      ]);
    } else {
      await db.insert(spotListingSchedulesTable).values([
        { listingId: l.id, date: "2026-05-17", startTime: "10:00", endTime: "20:00" },
      ]);
    }
  }

  console.log(`Seeded ${listings.length} spot listings`);
  process.exit(0);
}

seedSpots().catch(err => { console.error(err); process.exit(1); });
