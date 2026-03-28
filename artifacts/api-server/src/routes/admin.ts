import { Router, type IRouter } from "express";
import { db, usersTable, trucksTable, eventsTable, menuItemsTable, scheduleEntriesTable, eventTrucksTable, plansTable, vendorSubscriptionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { AdminApproveTruckBody, AdminUpdateUserStatusBody } from "@workspace/api-zod";
import { requireRole } from "../lib/auth";
import bcrypt from "bcryptjs";
import { slugify } from "../lib/truckStatus";

const router: IRouter = Router();

router.get("/admin/users", requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }))
  );
});

router.get("/admin/trucks", requireRole("admin"), async (_req, res): Promise<void> => {
  const trucks = await db.select().from(trucksTable);
  const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  res.json(
    trucks.map((t) => ({
      id: t.id,
      name: t.name,
      cuisine: t.cuisine,
      isApproved: t.isApproved,
      vendorUserId: t.vendorUserId,
      vendorName: userMap.get(t.vendorUserId) ?? null,
      createdAt: t.createdAt,
    }))
  );
});

router.post("/admin/trucks/:id/approve", requireRole("admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = AdminApproveTruckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(trucksTable).set({ isApproved: parsed.data.isApproved }).where(eq(trucksTable.id, id));
  res.json({ message: "Truck status updated" });
});

router.post("/admin/users/:id/status", requireRole("admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = AdminUpdateUserStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(usersTable).set({ isActive: parsed.data.isActive }).where(eq(usersTable.id, id));
  res.json({ message: "User status updated" });
});

router.get("/admin/stats", requireRole("admin"), async (_req, res): Promise<void> => {
  const [users] = await db.select({ count: count() }).from(usersTable);
  const [trucks] = await db.select({ count: count() }).from(trucksTable);
  const [events] = await db.select({ count: count() }).from(eventsTable);
  const allTrucks = await db.select().from(trucksTable);
  const pendingApproval = allTrucks.filter((t) => !t.isApproved).length;
  const activeTrucks = allTrucks.filter((t) => t.isApproved).length;

  const allSubs = await db.select({ status: vendorSubscriptionsTable.status }).from(vendorSubscriptionsTable);
  const trialing = allSubs.filter((s) => s.status === "trialing").length;
  const active = allSubs.filter((s) => s.status === "active").length;
  const pastDue = allSubs.filter((s) => s.status === "past_due").length;

  res.json({
    totalUsers: users.count,
    totalTrucks: trucks.count,
    totalEvents: events.count,
    pendingApproval,
    activeTrucks,
    trialing,
    activeSubscriptions: active,
    pastDue,
  });
});

router.get("/admin/plans", requireRole("admin"), async (_req, res): Promise<void> => {
  const plans = await db.select().from(plansTable).orderBy(plansTable.id);
  res.json(plans);
});

router.post("/admin/plans", requireRole("admin"), async (req, res): Promise<void> => {
  const { name, description, monthlyPrice, trialDays, features, isActive, stripePriceId } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [plan] = await db.insert(plansTable).values({
    name,
    description: description ?? null,
    monthlyPrice: Number(monthlyPrice ?? 0),
    trialDays: Number(trialDays ?? 90),
    features: Array.isArray(features) ? features : [],
    isActive: isActive !== false,
    stripePriceId: stripePriceId ?? null,
  }).returning();
  res.status(201).json(plan);
});

router.put("/admin/plans/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, description, monthlyPrice, trialDays, features, isActive, stripePriceId } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (monthlyPrice !== undefined) update.monthlyPrice = Number(monthlyPrice);
  if (trialDays !== undefined) update.trialDays = Number(trialDays);
  if (features !== undefined) update.features = features;
  if (isActive !== undefined) update.isActive = isActive;
  if (stripePriceId !== undefined) update.stripePriceId = stripePriceId;
  const [plan] = await db.update(plansTable).set(update).where(eq(plansTable.id, id)).returning();
  res.json(plan);
});

router.delete("/admin/plans/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.update(plansTable).set({ isActive: false }).where(eq(plansTable.id, id));
  res.json({ message: "Plan deactivated" });
});

router.get("/admin/subscriptions", requireRole("admin"), async (_req, res): Promise<void> => {
  const subs = await db
    .select({
      id: vendorSubscriptionsTable.id,
      status: vendorSubscriptionsTable.status,
      trialEndsAt: vendorSubscriptionsTable.trialEndsAt,
      currentPeriodEnd: vendorSubscriptionsTable.currentPeriodEnd,
      stripeCustomerId: vendorSubscriptionsTable.stripeCustomerId,
      stripeSubscriptionId: vendorSubscriptionsTable.stripeSubscriptionId,
      canceledAt: vendorSubscriptionsTable.canceledAt,
      createdAt: vendorSubscriptionsTable.createdAt,
      vendorUserId: usersTable.id,
      vendorName: usersTable.name,
      vendorEmail: usersTable.email,
      planId: plansTable.id,
      planName: plansTable.name,
      monthlyPrice: plansTable.monthlyPrice,
    })
    .from(vendorSubscriptionsTable)
    .innerJoin(usersTable, eq(vendorSubscriptionsTable.vendorUserId, usersTable.id))
    .innerJoin(plansTable, eq(vendorSubscriptionsTable.planId, plansTable.id))
    .orderBy(vendorSubscriptionsTable.createdAt);

  const now = new Date();
  res.json(subs.map((s) => ({
    ...s,
    trialDaysLeft: s.trialEndsAt && s.status === "trialing"
      ? Math.max(0, Math.ceil((s.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : null,
  })));
});

router.post("/admin/subscriptions/:id/grant-trial", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { days } = req.body as { days?: number };
  if (!days || days < 1) { res.status(400).json({ error: "days must be a positive number" }); return; }

  const [sub] = await db.select().from(vendorSubscriptionsTable).where(eq(vendorSubscriptionsTable.id, id));
  if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }

  const base = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
  const newEnd = new Date(base.getTime() + days * 86400000);

  const [updated] = await db
    .update(vendorSubscriptionsTable)
    .set({ trialEndsAt: newEnd, status: "trialing" })
    .where(eq(vendorSubscriptionsTable.id, id))
    .returning();

  res.json(updated);
});

router.post("/admin/subscriptions/:id/set-plan", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { planId, status } = req.body as { planId?: number; status?: string };
  const update: Record<string, unknown> = {};
  if (planId !== undefined) update.planId = planId;
  if (status !== undefined) update.status = status;
  const [updated] = await db.update(vendorSubscriptionsTable).set(update).where(eq(vendorSubscriptionsTable.id, id)).returning();
  res.json(updated);
});

router.post("/admin/subscriptions/:id/cancel", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [updated] = await db
    .update(vendorSubscriptionsTable)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(vendorSubscriptionsTable.id, id))
    .returning();
  res.json(updated);
});

router.post("/admin/seed", requireRole("admin"), async (_req, res): Promise<void> => {
  await seedDatabase();
  res.json({ message: "Demo data seeded successfully" });
});

export async function seedDatabase() {
  await db.delete(eventTrucksTable);
  await db.delete(scheduleEntriesTable);
  await db.delete(menuItemsTable);
  await db.delete(eventsTable);
  await db.delete(trucksTable);
  await db.delete(usersTable);

  const passwordHash = await bcrypt.hash("password123", 10);

  const [admin] = await db
    .insert(usersTable)
    .values({ name: "Admin", email: "admin@okfoodtrucks.com", passwordHash, role: "admin", isActive: true })
    .returning();

  const [vendor1] = await db
    .insert(usersTable)
    .values({ name: "Jake Martinez", email: "vendor1@okfoodtrucks.com", passwordHash, role: "vendor", isActive: true })
    .returning();

  const [vendor2] = await db
    .insert(usersTable)
    .values({ name: "Sarah Cole", email: "vendor2@okfoodtrucks.com", passwordHash, role: "vendor", isActive: true })
    .returning();

  const [vendor3] = await db
    .insert(usersTable)
    .values({ name: "David Kim", email: "vendor3@okfoodtrucks.com", passwordHash, role: "vendor", isActive: true })
    .returning();

  const [vendor4] = await db
    .insert(usersTable)
    .values({ name: "Amber Reynolds", email: "vendor4@okfoodtrucks.com", passwordHash, role: "vendor", isActive: true })
    .returning();

  const [organizer1] = await db
    .insert(usersTable)
    .values({ name: "City Events OKC", email: "organizer1@okfoodtrucks.com", passwordHash, role: "organizer", isActive: true })
    .returning();

  const [organizer2] = await db
    .insert(usersTable)
    .values({ name: "Edmond Parks Dept", email: "organizer2@okfoodtrucks.com", passwordHash, role: "organizer", isActive: true })
    .returning();

  const trucks = await db
    .insert(trucksTable)
    .values([
      { vendorUserId: vendor1.id, name: "Red Dirt Tacos", slug: "red-dirt-tacos", cuisine: "Tacos & Mexican", description: "Authentic Oklahoma-style street tacos with a Red Dirt twist. Slow-cooked meats, handmade tortillas, and locally sourced toppings.", isApproved: true, isLive: false },
      { vendorUserId: vendor2.id, name: "Prairie Smoke BBQ", slug: "prairie-smoke-bbq", cuisine: "Barbecue", description: "Low and slow Oklahoma BBQ smoked over hickory and pecan wood. Brisket, ribs, pulled pork, and all the fixings.", isApproved: true, isLive: false },
      { vendorUserId: vendor3.id, name: "Okie Roast Coffee", slug: "okie-roast-coffee", cuisine: "Coffee & Drinks", description: "Artisan coffee roasted right here in Oklahoma. Specialty espresso drinks, cold brew, and pastries to start your day.", isApproved: true, isLive: false },
      { vendorUserId: vendor4.id, name: "Route 66 Burgers", slug: "route-66-burgers", cuisine: "Burgers & American", description: "Classic American smash burgers with a Route 66 spirit. Fresh-ground beef, homemade sauces, and crispy fries.", isApproved: true, isLive: false },
      { vendorUserId: vendor1.id, name: "Big Friendly Pizza", slug: "big-friendly-pizza", cuisine: "Pizza", description: "Wood-fired pizza made with Oklahoma pride. Creative seasonal toppings and traditional favorites done right.", isApproved: true, isLive: false },
      { vendorUserId: vendor2.id, name: "Hometown Sno Cones", slug: "hometown-sno-cones", cuisine: "Desserts & Sweets", description: "Oklahoma's favorite summer treat! Over 50 flavors of snoballs with cream, condensed milk, and fresh fruit options.", isApproved: true, isLive: false },
      { vendorUserId: vendor3.id, name: "Seoul Wagon", slug: "seoul-wagon", cuisine: "Asian Fusion & Korean", description: "Korean-American fusion bringing bold flavors to the heartland. Korean BBQ tacos, bibimbap bowls, and kimchi fries.", isApproved: true, isLive: false },
      { vendorUserId: vendor4.id, name: "Boomtown Bites", slug: "boomtown-bites", cuisine: "Comfort Food & Southern", description: "Oklahoma comfort food at its finest. Chicken tenders, mac and cheese, loaded baked potatoes, and sweet tea.", isApproved: true, isLive: false },
    ])
    .returning();

  const [redDirt, prairieSmokebbq, okieRoast, route66, bigFriendly, hometown, seoul, boomtown] = trucks;

  await db.insert(menuItemsTable).values([
    { truckId: redDirt.id, name: "Brisket Taco", description: "Smoked brisket, pickled red onion, cilantro, lime crema on handmade tortilla", price: 4.50, category: "Tacos" },
    { truckId: redDirt.id, name: "Al Pastor Taco", description: "Marinated pork with pineapple, onion, and cilantro", price: 3.75, category: "Tacos" },
    { truckId: redDirt.id, name: "Street Corn", description: "Elote-style corn with cotija, chili, and lime", price: 4.00, category: "Sides" },
    { truckId: redDirt.id, name: "Guacamole & Chips", description: "Fresh housemade guacamole with tortilla chips", price: 5.00, category: "Sides" },
    { truckId: redDirt.id, name: "Taco Plate (3)", description: "Any three tacos with rice and beans", price: 13.00, category: "Plates" },

    { truckId: prairieSmokebbq.id, name: "Brisket Sandwich", description: "Hand-sliced smoked brisket on brioche with house sauce", price: 12.00, category: "Sandwiches" },
    { truckId: prairieSmokebbq.id, name: "Baby Back Ribs Half Rack", description: "Hickory-smoked with dry rub and a side", price: 18.00, category: "Plates" },
    { truckId: prairieSmokebbq.id, name: "Pulled Pork Plate", description: "12-hour smoked pork with coleslaw and baked beans", price: 14.00, category: "Plates" },
    { truckId: prairieSmokebbq.id, name: "Smoked Jalapeño Sausage", description: "House-made jalapeño cheddar sausage with mustard", price: 8.00, category: "Sides" },
    { truckId: prairieSmokebbq.id, name: "Mac & Cheese", description: "Smoked gouda mac with crispy breadcrumbs", price: 5.00, category: "Sides" },

    { truckId: okieRoast.id, name: "Oklahoma Sunrise Latte", description: "Espresso with local honey, oat milk, and a hint of cinnamon", price: 6.50, category: "Hot Drinks" },
    { truckId: okieRoast.id, name: "Cold Brew", description: "16-hour cold brew, smooth and full-bodied", price: 5.00, category: "Cold Drinks" },
    { truckId: okieRoast.id, name: "Iced Lavender Oat Latte", description: "House lavender syrup, espresso, oat milk over ice", price: 7.00, category: "Cold Drinks" },
    { truckId: okieRoast.id, name: "Avocado Toast", description: "Sourdough, smashed avocado, everything bagel seasoning, egg", price: 8.00, category: "Food" },
    { truckId: okieRoast.id, name: "Blueberry Scone", description: "Freshly baked daily with local blueberries", price: 3.50, category: "Food" },

    { truckId: route66.id, name: "Route 66 Smash Burger", description: "Double smash patty, american cheese, Route sauce, pickles, onion", price: 10.00, category: "Burgers" },
    { truckId: route66.id, name: "Oklahoma Onion Burger", description: "Classic OK-style with thin-sliced onions smashed into the patty", price: 9.00, category: "Burgers" },
    { truckId: route66.id, name: "Crispy Chicken Sandwich", description: "Buttermilk fried chicken, pickles, honey mustard on brioche", price: 11.00, category: "Sandwiches" },
    { truckId: route66.id, name: "Chili Cheese Fries", description: "Hand-cut fries with house chili and cheddar", price: 7.00, category: "Sides" },
    { truckId: route66.id, name: "Vanilla Shake", description: "Hand-spun vanilla milkshake", price: 5.50, category: "Drinks" },

    { truckId: bigFriendly.id, name: "Margherita Pizza", description: "San Marzano tomato, fresh mozzarella, basil, EVOO", price: 14.00, category: "Pizzas" },
    { truckId: bigFriendly.id, name: "Oklahoma BBQ Chicken Pizza", description: "BBQ sauce, grilled chicken, red onion, cheddar, cilantro", price: 16.00, category: "Pizzas" },
    { truckId: bigFriendly.id, name: "Pepperoni Classic", description: "House tomato sauce, mozzarella, cup-and-char pepperoni", price: 15.00, category: "Pizzas" },
    { truckId: bigFriendly.id, name: "Garden Veggie Pizza", description: "Seasonal vegetables, garlic oil, goat cheese", price: 15.00, category: "Pizzas" },
    { truckId: bigFriendly.id, name: "Garlic Knots (6)", description: "Fresh-baked with garlic butter and parmesan", price: 5.00, category: "Sides" },

    { truckId: hometown.id, name: "Classic Snowball", description: "Your choice of flavor with fluffy shaved ice", price: 4.00, category: "Snowballs" },
    { truckId: hometown.id, name: "Cream Snowball", description: "With sweet cream drizzle and your choice of flavor", price: 5.00, category: "Snowballs" },
    { truckId: hometown.id, name: "Wedding Cake Snowball", description: "Vanilla almond with cream and condensed milk", price: 5.50, category: "Snowballs" },
    { truckId: hometown.id, name: "Fruit Punch Bomb", description: "Three-flavor combination with fresh fruit", price: 6.00, category: "Specialty" },
    { truckId: hometown.id, name: "Pickle Snowball", description: "Oklahoma favorite — dill pickle flavored!", price: 4.50, category: "Specialty" },

    { truckId: seoul.id, name: "Korean BBQ Taco", description: "Bulgogi beef, kimchi slaw, gochujang mayo on corn tortilla", price: 4.50, category: "Tacos" },
    { truckId: seoul.id, name: "Bibimbap Bowl", description: "Rice, mixed vegetables, gochujang, fried egg, pickled daikon", price: 13.00, category: "Bowls" },
    { truckId: seoul.id, name: "Kimchi Fries", description: "Fries topped with kimchi, cheese sauce, sriracha mayo, green onion", price: 8.00, category: "Sides" },
    { truckId: seoul.id, name: "Spicy Pork Belly Bao", description: "Steamed bun with braised pork belly, cucumber, hoisin", price: 7.00, category: "Bao" },
    { truckId: seoul.id, name: "Boba Tea", description: "Your choice of milk tea with tapioca pearls", price: 6.00, category: "Drinks" },

    { truckId: boomtown.id, name: "Chicken Tender Plate", description: "Hand-battered tenders with honey mustard and fries", price: 12.00, category: "Plates" },
    { truckId: boomtown.id, name: "Loaded Baked Potato", description: "With butter, sour cream, cheddar, bacon, chives", price: 9.00, category: "Sides" },
    { truckId: boomtown.id, name: "Southern Mac & Cheese", description: "Four-cheese blend baked to perfection", price: 7.00, category: "Sides" },
    { truckId: boomtown.id, name: "Country Fried Steak Sandwich", description: "Breaded sirloin, country gravy, pickles on Texas toast", price: 13.00, category: "Sandwiches" },
    { truckId: boomtown.id, name: "Sweet Tea (32 oz)", description: "Fresh-brewed Oklahoma sweet tea", price: 3.00, category: "Drinks" },
  ]);

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  function makeDate(daysFromNow: number, hour: number, minute: number = 0) {
    const d = new Date(today);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const scheduleData = [
    // Today - lunch stops
    { truckId: redDirt.id, title: "Lunch at Scissortail", venueName: "Scissortail Park", address: "300 SW 7th St", city: "Oklahoma City", latitude: 35.4590, longitude: -97.5183, startDateTime: makeDate(0, 11), endDateTime: makeDate(0, 14), isLive: false, isRecurring: false, notes: "Near the main pavilion" },
    { truckId: prairieSmokebbq.id, title: "Lunch at Mitch Park", venueName: "Mitch Park", address: "1501 W Edmond Rd", city: "Edmond", latitude: 35.6637, longitude: -97.4913, startDateTime: makeDate(0, 11, 30), endDateTime: makeDate(0, 14, 30), isLive: false, isRecurring: false, notes: null },
    { truckId: okieRoast.id, title: "Morning Coffee Downtown Edmond", venueName: "Downtown Edmond", address: "100 S Broadway", city: "Edmond", latitude: 35.6529, longitude: -97.4784, startDateTime: makeDate(0, 7), endDateTime: makeDate(0, 12), isLive: false, isRecurring: true, notes: "Main Street corner" },
    { truckId: route66.id, title: "Lunch at University North Oval", venueName: "University North Oval", address: "University Blvd & W Boyd St", city: "Norman", latitude: 35.2093, longitude: -97.4459, startDateTime: makeDate(0, 11), endDateTime: makeDate(0, 14), isLive: false, isRecurring: false, notes: null },
    { truckId: hometown.id, title: "Afternoon at Mitch Park", venueName: "Mitch Park", address: "1501 W Edmond Rd", city: "Edmond", latitude: 35.6637, longitude: -97.4913, startDateTime: makeDate(0, 14), endDateTime: makeDate(0, 18), isLive: false, isRecurring: false, notes: null },

    // Today - dinner stops
    { truckId: bigFriendly.id, title: "Dinner at Scissortail Park", venueName: "Scissortail Park", address: "300 SW 7th St", city: "Oklahoma City", latitude: 35.4590, longitude: -97.5183, startDateTime: makeDate(0, 17), endDateTime: makeDate(0, 21), isLive: false, isRecurring: false, notes: "By the amphitheater" },
    { truckId: seoul.id, title: "Dinner Service OKC Brewery Row", venueName: "Coop Aleworks", address: "200 SW 69th St", city: "Oklahoma City", latitude: 35.4023, longitude: -97.5284, startDateTime: makeDate(0, 17, 30), endDateTime: makeDate(0, 21, 30), isLive: false, isRecurring: true, notes: "Weekend brewery pop-up" },
    { truckId: boomtown.id, title: "Moore Central Park Evening", venueName: "Moore Central Park", address: "501 SW 4th St", city: "Moore", latitude: 35.3382, longitude: -97.4862, startDateTime: makeDate(0, 16), endDateTime: makeDate(0, 20), isLive: false, isRecurring: false, notes: null },

    // Tomorrow
    { truckId: redDirt.id, title: "Yukon City Park", venueName: "Yukon City Park", address: "301 Elm Ave", city: "Yukon", latitude: 35.5059, longitude: -97.7617, startDateTime: makeDate(1, 11), endDateTime: makeDate(1, 15), isLive: false, isRecurring: false, notes: null },
    { truckId: prairieSmokebbq.id, title: "Norman Lunch", venueName: "University North Oval", address: "University Blvd", city: "Norman", latitude: 35.2093, longitude: -97.4459, startDateTime: makeDate(1, 11), endDateTime: makeDate(1, 14), isLive: false, isRecurring: false, notes: null },
    { truckId: okieRoast.id, title: "Mustang Morning", venueName: "Mustang Town Center", address: "1 S Main St", city: "Mustang", latitude: 35.3845, longitude: -97.7245, startDateTime: makeDate(1, 7, 30), endDateTime: makeDate(1, 11, 30), isLive: false, isRecurring: false, notes: null },
    { truckId: route66.id, title: "Edmond Weekend Lunch", venueName: "Downtown Edmond", address: "100 S Broadway", city: "Edmond", latitude: 35.6529, longitude: -97.4784, startDateTime: makeDate(1, 11), endDateTime: makeDate(1, 15), isLive: false, isRecurring: false, notes: null },
    { truckId: bigFriendly.id, title: "Moore Park Lunch", venueName: "Moore Central Park", address: "501 SW 4th St", city: "Moore", latitude: 35.3382, longitude: -97.4862, startDateTime: makeDate(1, 12), endDateTime: makeDate(1, 15), isLive: false, isRecurring: false, notes: null },

    // Day after tomorrow
    { truckId: hometown.id, title: "Yukon Park Summer Fun", venueName: "Yukon City Park", address: "301 Elm Ave", city: "Yukon", latitude: 35.5059, longitude: -97.7617, startDateTime: makeDate(2, 13), endDateTime: makeDate(2, 18), isLive: false, isRecurring: false, notes: null },
    { truckId: seoul.id, title: "OKC Farmers Market", venueName: "Scissortail Park", address: "300 SW 7th St", city: "Oklahoma City", latitude: 35.4590, longitude: -97.5183, startDateTime: makeDate(2, 9), endDateTime: makeDate(2, 14), isLive: false, isRecurring: false, notes: "Saturday farmers market pop-up" },
    { truckId: boomtown.id, title: "Norman Dinner", venueName: "University North Oval", address: "University Blvd", city: "Norman", latitude: 35.2093, longitude: -97.4459, startDateTime: makeDate(2, 17), endDateTime: makeDate(2, 21), isLive: false, isRecurring: false, notes: null },

    // 3 days out
    { truckId: redDirt.id, title: "Edmond Dinner Pop-Up", venueName: "Mitch Park", address: "1501 W Edmond Rd", city: "Edmond", latitude: 35.6637, longitude: -97.4913, startDateTime: makeDate(3, 17), endDateTime: makeDate(3, 20, 30), isLive: false, isRecurring: false, notes: null },
    { truckId: route66.id, title: "OKC Lunch Run", venueName: "Scissortail Park", address: "300 SW 7th St", city: "Oklahoma City", latitude: 35.4590, longitude: -97.5183, startDateTime: makeDate(3, 11), endDateTime: makeDate(3, 14), isLive: false, isRecurring: false, notes: null },
    { truckId: prairieSmokebbq.id, title: "Yukon BBQ Night", venueName: "Yukon City Park", address: "301 Elm Ave", city: "Yukon", latitude: 35.5059, longitude: -97.7617, startDateTime: makeDate(3, 16), endDateTime: makeDate(3, 21), isLive: false, isRecurring: false, notes: null },
    { truckId: bigFriendly.id, title: "Pizza Night OKC", venueName: "Coop Aleworks", address: "200 SW 69th St", city: "Oklahoma City", latitude: 35.4023, longitude: -97.5284, startDateTime: makeDate(3, 18), endDateTime: makeDate(3, 22), isLive: false, isRecurring: true, notes: "Friday night brewery spot" },
  ];

  const scheduleEntries = await db.insert(scheduleEntriesTable).values(scheduleData).returning();

  const events = await db
    .insert(eventsTable)
    .values([
      {
        organizerUserId: organizer1.id,
        name: "Scissortail Park Food Truck Festival",
        slug: "scissortail-food-truck-fest",
        description: "Oklahoma City's biggest food truck gathering at the beautiful Scissortail Park. Music, food, and community.",
        venueName: "Scissortail Park",
        address: "300 SW 7th St",
        city: "Oklahoma City",
        latitude: 35.4590,
        longitude: -97.5183,
        startDateTime: makeDate(5, 11),
        endDateTime: makeDate(5, 20),
        publicNotes: "Free admission. Paid parking available. Pet friendly!",
        vendorNotes: "Set up begins at 9 AM. Must check in with event staff upon arrival.",
      },
      {
        organizerUserId: organizer2.id,
        name: "Edmond Mitch Park Food Truck Rally",
        slug: "edmond-mitch-park-rally",
        description: "Edmond's monthly food truck rally at Mitch Park. Family-friendly with live music and lawn games.",
        venueName: "Mitch Park",
        address: "1501 W Edmond Rd",
        city: "Edmond",
        latitude: 35.6637,
        longitude: -97.4913,
        startDateTime: makeDate(7, 12),
        endDateTime: makeDate(7, 19),
        publicNotes: "Bring your lawn chairs! Food trucks accept cash and card.",
        vendorNotes: "Vendor spots are 20x20. Power hookups available on request.",
      },
      {
        organizerUserId: organizer1.id,
        name: "Norman Campus Eats Week",
        slug: "norman-campus-eats-week",
        description: "A week-long food truck event at the University of Oklahoma campus north oval.",
        venueName: "University North Oval",
        address: "University Blvd & W Boyd St",
        city: "Norman",
        latitude: 35.2093,
        longitude: -97.4459,
        startDateTime: makeDate(10, 11),
        endDateTime: makeDate(10, 14),
        publicNotes: "Open to the public! OU students get a discount with ID.",
        vendorNotes: "Lunch service only 11am-2pm. Must follow campus parking rules.",
      },
      {
        organizerUserId: organizer2.id,
        name: "Yukon Summer Nights",
        slug: "yukon-summer-nights",
        description: "An evening food truck and community event at Yukon City Park with live country music.",
        venueName: "Yukon City Park",
        address: "301 Elm Ave",
        city: "Yukon",
        latitude: 35.5059,
        longitude: -97.7617,
        startDateTime: makeDate(14, 16),
        endDateTime: makeDate(14, 21),
        publicNotes: "Free concert and community night. Kids' activities available.",
        vendorNotes: "Contact organizer for preferred spot placement.",
      },
      {
        organizerUserId: organizer1.id,
        name: "Moore Central Park Fall Fest",
        slug: "moore-central-park-fall-fest",
        description: "Moore's annual fall festival featuring food trucks, craft vendors, and a pumpkin patch.",
        venueName: "Moore Central Park",
        address: "501 SW 4th St",
        city: "Moore",
        latitude: 35.3382,
        longitude: -97.4862,
        startDateTime: makeDate(21, 10),
        endDateTime: makeDate(21, 20),
        publicNotes: "Family fun for all ages! Craft vendors, food trucks, and fall activities.",
        vendorNotes: "Early setup preferred (before 9 AM). Generators allowed.",
      },
    ])
    .returning();

  const [scissortailFest, edmondRally, normanWeek, yukonSummer, mooreFest] = events;

  await db.insert(eventTrucksTable).values([
    { eventId: scissortailFest.id, truckId: redDirt.id, status: "confirmed" },
    { eventId: scissortailFest.id, truckId: prairieSmokebbq.id, status: "confirmed" },
    { eventId: scissortailFest.id, truckId: route66.id, status: "confirmed" },
    { eventId: scissortailFest.id, truckId: seoul.id, status: "invited" },
    { eventId: scissortailFest.id, truckId: boomtown.id, status: "pending" },

    { eventId: edmondRally.id, truckId: okieRoast.id, status: "confirmed" },
    { eventId: edmondRally.id, truckId: hometown.id, status: "confirmed" },
    { eventId: edmondRally.id, truckId: bigFriendly.id, status: "confirmed" },
    { eventId: edmondRally.id, truckId: redDirt.id, status: "invited" },

    { eventId: normanWeek.id, truckId: route66.id, status: "confirmed" },
    { eventId: normanWeek.id, truckId: seoul.id, status: "confirmed" },
    { eventId: normanWeek.id, truckId: prairieSmokebbq.id, status: "pending" },

    { eventId: yukonSummer.id, truckId: boomtown.id, status: "confirmed" },
    { eventId: yukonSummer.id, truckId: hometown.id, status: "invited" },
    { eventId: yukonSummer.id, truckId: bigFriendly.id, status: "pending" },

    { eventId: mooreFest.id, truckId: redDirt.id, status: "confirmed" },
    { eventId: mooreFest.id, truckId: prairieSmokebbq.id, status: "confirmed" },
    { eventId: mooreFest.id, truckId: okieRoast.id, status: "invited" },
    { eventId: mooreFest.id, truckId: seoul.id, status: "confirmed" },
    { eventId: mooreFest.id, truckId: boomtown.id, status: "pending" },
  ]);
}

export default router;
