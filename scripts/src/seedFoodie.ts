import {
  db,
  usersTable,
  favoritesTable,
  reviewsTable,
  notificationPreferencesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding foodie demo account...");

  const passwordHash = await bcrypt.hash("password123", 10);

  await db.delete(usersTable).where(eq(usersTable.email, "foodie@okfoodtrucks.com"));

  const [morgan] = await db
    .insert(usersTable)
    .values({
      name: "Morgan Chen",
      email: "foodie@okfoodtrucks.com",
      passwordHash,
      role: "customer",
      isActive: true,
      twitterHandle: "morganeats",
      instagramHandle: "morganeats_okc",
      facebookUrl: "https://facebook.com/morganchenokcfoodie",
    })
    .returning();

  console.log("Created foodie user id:", morgan.id);

  await db.insert(favoritesTable).values([
    { userId: morgan.id, truckId: 1 },
    { userId: morgan.id, truckId: 2 },
    { userId: morgan.id, truckId: 5 },
    { userId: morgan.id, truckId: 7 },
    { userId: morgan.id, truckId: 3 },
  ]);
  console.log("Favorites added: 5 trucks");

  await db.insert(reviewsTable).values([
    {
      userId: morgan.id,
      truckId: 1,
      rating: 5,
      comment: "Absolute best street tacos in the metro. The brisket taco with pickled red onion is a must-order — I dream about it. Jake's crew is always friendly and the handmade tortillas make all the difference. A permanent fixture on my lunch rotation.",
    },
    {
      userId: morgan.id,
      truckId: 2,
      rating: 5,
      comment: "Prairie Smoke is the real deal. I've had BBQ from coast to coast and this brisket sandwich belongs in any conversation about the best in the country. The smoked jalapeño sausage is criminally underrated. Get there early — they sell out.",
    },
    {
      userId: morgan.id,
      truckId: 7,
      rating: 5,
      comment: "Seoul Wagon completely changed how I think about fusion food. The Korean BBQ taco is a revelation — bulgogi, kimchi slaw, gochujang crema on a warm tortilla. It shouldn't work as well as it does. Now I track them religiously and show up wherever they park.",
    },
    {
      userId: morgan.id,
      truckId: 5,
      rating: 4,
      comment: "Wood-fired pizza from a truck still feels like a miracle. The seasonal white pizza with arugula and prosciutto was outstanding. Crust had great char and chew. Only docking one star because the wait can get long during lunch rush, but it's 100% worth it.",
    },
    {
      userId: morgan.id,
      truckId: 3,
      rating: 4,
      comment: "Okie Roast's cold brew is some of the best I've had outside of a proper specialty café. The single-origin beans are no joke. Would love to see more pastry options, but the cortado alone makes it worth hunting them down.",
    },
  ]);
  console.log("Reviews added: 5 trucks");

  await db.insert(notificationPreferencesTable).values([
    { userId: morgan.id, truckId: 1, notifyWhenOpen: true, notifyWhenNearby: true },
    { userId: morgan.id, truckId: 7, notifyWhenOpen: true, notifyWhenNearby: false },
    { userId: morgan.id, truckId: 5, notifyWhenOpen: false, notifyWhenNearby: true },
    { userId: morgan.id, truckId: 2, notifyWhenOpen: true, notifyWhenNearby: false },
  ]);
  console.log("Notification preferences set: 4 trucks");

  console.log("\n✅ Foodie demo account ready!");
  console.log("   Email:    foodie@okfoodtrucks.com");
  console.log("   Password: password123");
  console.log("   Name:     Morgan Chen");
  console.log("   Role:     customer");
  console.log("   Favorites: 5 | Reviews: 5 | Tracked: 4");
}

main().catch(console.error).finally(() => process.exit(0));
