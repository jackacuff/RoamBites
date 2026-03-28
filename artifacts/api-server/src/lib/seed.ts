import { db } from "@workspace/db";
import {
  usersTable,
  trucksTable,
  menuItemsTable,
  eventsTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

const DEMO_PASSWORD_HASH = "$2b$10$VLJqNTb.veXTuyTj05/HQ.fYMUSgR053YvPIBlfaX0/x2ZOim1nju";
const SUPERADMIN_HASH = "$2b$10$xQf3P3FotxH8jTAAsec1MeZX.uS3zQszOp5ap0g2f/82W9kmZ5n/S";

export async function seedIfEmpty() {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const count = Number(existing[0]?.count ?? 0);
    if (count > 0) {
      logger.info({ count }, "Database already seeded, skipping");
      return;
    }

    logger.info("Seeding database with demo data…");

    const users = await db.insert(usersTable).values([
      { name: "Admin", email: "admin@okfoodtrucks.com", passwordHash: DEMO_PASSWORD_HASH, role: "admin" },
      { name: "Jake Martinez", email: "vendor1@okfoodtrucks.com", passwordHash: DEMO_PASSWORD_HASH, role: "vendor" },
      { name: "Sarah Cole", email: "vendor2@okfoodtrucks.com", passwordHash: DEMO_PASSWORD_HASH, role: "vendor" },
      { name: "David Kim", email: "vendor3@okfoodtrucks.com", passwordHash: DEMO_PASSWORD_HASH, role: "vendor" },
      { name: "Amber Reynolds", email: "vendor4@okfoodtrucks.com", passwordHash: DEMO_PASSWORD_HASH, role: "vendor" },
      { name: "City Events OKC", email: "organizer1@okfoodtrucks.com", passwordHash: DEMO_PASSWORD_HASH, role: "organizer" },
      { name: "Edmond Parks Dept", email: "organizer2@okfoodtrucks.com", passwordHash: DEMO_PASSWORD_HASH, role: "organizer" },
      { name: "Jason Racuff", email: "jracuff@gmail.com", passwordHash: SUPERADMIN_HASH, role: "superadmin" },
    ]).returning({ id: usersTable.id, email: usersTable.email });

    const userByEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));

    const vendor1 = userByEmail["vendor1@okfoodtrucks.com"]!;
    const vendor2 = userByEmail["vendor2@okfoodtrucks.com"]!;
    const vendor3 = userByEmail["vendor3@okfoodtrucks.com"]!;
    const vendor4 = userByEmail["vendor4@okfoodtrucks.com"]!;
    const org1 = userByEmail["organizer1@okfoodtrucks.com"]!;
    const org2 = userByEmail["organizer2@okfoodtrucks.com"]!;

    const trucks = await db.insert(trucksTable).values([
      {
        vendorUserId: vendor1,
        name: "Red Dirt Tacos",
        slug: "red-dirt-tacos",
        cuisine: "Tacos & Mexican",
        description: "Authentic Oklahoma-style street tacos with a Red Dirt twist. Slow-cooked meats, handmade tortillas, and locally sourced toppings.",
        isApproved: true,
        isLive: false,
      },
      {
        vendorUserId: vendor2,
        name: "Prairie Smoke BBQ",
        slug: "prairie-smoke-bbq",
        cuisine: "Barbecue",
        description: "Low and slow Oklahoma BBQ smoked over hickory and pecan wood. Brisket, ribs, pulled pork, and all the fixings.",
        isApproved: true,
        isLive: false,
      },
      {
        vendorUserId: vendor3,
        name: "Okie Roast Coffee",
        slug: "okie-roast-coffee",
        cuisine: "Coffee & Drinks",
        description: "Artisan coffee roasted right here in Oklahoma. Specialty espresso drinks, cold brew, and pastries to start your day.",
        isApproved: true,
        isLive: false,
      },
      {
        vendorUserId: vendor4,
        name: "Route 66 Burgers",
        slug: "route-66-burgers",
        cuisine: "Burgers & American",
        description: "Classic American smash burgers with a Route 66 spirit. Fresh-ground beef, homemade sauces, and crispy fries.",
        isApproved: true,
        isLive: false,
      },
      {
        vendorUserId: vendor1,
        name: "Big Friendly Pizza",
        slug: "big-friendly-pizza",
        cuisine: "Pizza",
        description: "Wood-fired pizza made with Oklahoma pride. Creative seasonal toppings and traditional favorites done right.",
        isApproved: true,
        isLive: false,
      },
      {
        vendorUserId: vendor2,
        name: "Hometown Sno Cones",
        slug: "hometown-sno-cones",
        cuisine: "Desserts & Sweets",
        description: "Oklahoma's favorite summer treat! Over 50 flavors of snoballs with cream, condensed milk, and fresh fruit options.",
        isApproved: true,
        isLive: false,
      },
      {
        vendorUserId: vendor3,
        name: "Seoul Wagon",
        slug: "seoul-wagon",
        cuisine: "Asian Fusion & Korean",
        description: "Korean-American fusion bringing bold flavors to the heartland. Korean BBQ tacos, bibimbap bowls, and kimchi fries.",
        isApproved: true,
        isLive: false,
      },
      {
        vendorUserId: vendor4,
        name: "Boomtown Bites",
        slug: "boomtown-bites",
        cuisine: "Comfort Food & Southern",
        description: "Oklahoma comfort food at its finest. Chicken tenders, mac and cheese, loaded baked potatoes, and sweet tea.",
        isApproved: true,
        isLive: false,
      },
    ]).returning({ id: trucksTable.id, slug: trucksTable.slug });

    const truckBySlug = Object.fromEntries(trucks.map((t) => [t.slug, t.id]));

    await db.insert(menuItemsTable).values([
      { truckId: truckBySlug["red-dirt-tacos"]!, name: "Brisket Taco", description: "Smoked brisket, pickled red onion, cilantro, lime crema on handmade tortilla", price: 4.50, category: "Tacos" },
      { truckId: truckBySlug["red-dirt-tacos"]!, name: "Al Pastor Taco", description: "Marinated pork with pineapple, onion, and cilantro", price: 3.75, category: "Tacos" },
      { truckId: truckBySlug["red-dirt-tacos"]!, name: "Street Corn", description: "Elote-style corn with cotija, chili, and lime", price: 4.00, category: "Sides" },
      { truckId: truckBySlug["red-dirt-tacos"]!, name: "Guacamole & Chips", description: "Fresh housemade guacamole with tortilla chips", price: 5.00, category: "Sides" },
      { truckId: truckBySlug["red-dirt-tacos"]!, name: "Taco Plate (3)", description: "Any three tacos with rice and beans", price: 13.00, category: "Plates" },

      { truckId: truckBySlug["prairie-smoke-bbq"]!, name: "Brisket Sandwich", description: "Hand-sliced smoked brisket on brioche with house sauce", price: 12.00, category: "Sandwiches" },
      { truckId: truckBySlug["prairie-smoke-bbq"]!, name: "Baby Back Ribs Half Rack", description: "Hickory-smoked with dry rub and a side", price: 18.00, category: "Plates" },
      { truckId: truckBySlug["prairie-smoke-bbq"]!, name: "Pulled Pork Plate", description: "12-hour smoked pork with coleslaw and baked beans", price: 14.00, category: "Plates" },
      { truckId: truckBySlug["prairie-smoke-bbq"]!, name: "Smoked Jalapeño Sausage", description: "House-made jalapeño cheddar sausage with mustard", price: 8.00, category: "Sides" },
      { truckId: truckBySlug["prairie-smoke-bbq"]!, name: "Mac & Cheese", description: "Smoked gouda mac with crispy breadcrumbs", price: 5.00, category: "Sides" },

      { truckId: truckBySlug["okie-roast-coffee"]!, name: "Oklahoma Sunrise Latte", description: "Espresso with local honey, oat milk, and a hint of cinnamon", price: 6.50, category: "Hot Drinks" },
      { truckId: truckBySlug["okie-roast-coffee"]!, name: "Cold Brew", description: "16-hour cold brew, smooth and full-bodied", price: 5.00, category: "Cold Drinks" },
      { truckId: truckBySlug["okie-roast-coffee"]!, name: "Iced Lavender Oat Latte", description: "House lavender syrup, espresso, oat milk over ice", price: 7.00, category: "Cold Drinks" },
      { truckId: truckBySlug["okie-roast-coffee"]!, name: "Avocado Toast", description: "Sourdough, smashed avocado, everything bagel seasoning, egg", price: 8.00, category: "Food" },
      { truckId: truckBySlug["okie-roast-coffee"]!, name: "Blueberry Scone", description: "Freshly baked daily with local blueberries", price: 3.50, category: "Food" },

      { truckId: truckBySlug["route-66-burgers"]!, name: "Route 66 Smash Burger", description: "Double smash patty, american cheese, Route sauce, pickles, onion", price: 10.00, category: "Burgers" },
      { truckId: truckBySlug["route-66-burgers"]!, name: "Oklahoma Onion Burger", description: "Classic OK-style with thin-sliced onions smashed into the patty", price: 9.00, category: "Burgers" },
      { truckId: truckBySlug["route-66-burgers"]!, name: "Crispy Chicken Sandwich", description: "Buttermilk fried chicken, pickles, honey mustard on brioche", price: 11.00, category: "Sandwiches" },
      { truckId: truckBySlug["route-66-burgers"]!, name: "Chili Cheese Fries", description: "Hand-cut fries with house chili and cheddar", price: 7.00, category: "Sides" },
      { truckId: truckBySlug["route-66-burgers"]!, name: "Vanilla Shake", description: "Hand-spun vanilla milkshake", price: 5.50, category: "Drinks" },

      { truckId: truckBySlug["big-friendly-pizza"]!, name: "Margherita Pizza", description: "San Marzano tomato, fresh mozzarella, basil, EVOO", price: 14.00, category: "Pizzas" },
      { truckId: truckBySlug["big-friendly-pizza"]!, name: "Oklahoma BBQ Chicken Pizza", description: "BBQ sauce, grilled chicken, red onion, cheddar, cilantro", price: 16.00, category: "Pizzas" },
      { truckId: truckBySlug["big-friendly-pizza"]!, name: "Pepperoni Classic", description: "House tomato sauce, mozzarella, cup-and-char pepperoni", price: 15.00, category: "Pizzas" },
      { truckId: truckBySlug["big-friendly-pizza"]!, name: "Garden Veggie Pizza", description: "Seasonal vegetables, garlic oil, goat cheese", price: 15.00, category: "Pizzas" },
      { truckId: truckBySlug["big-friendly-pizza"]!, name: "Garlic Knots (6)", description: "Fresh-baked with garlic butter and parmesan", price: 5.00, category: "Sides" },

      { truckId: truckBySlug["hometown-sno-cones"]!, name: "Classic Snowball", description: "Your choice of flavor with fluffy shaved ice", price: 4.00, category: "Snowballs" },
      { truckId: truckBySlug["hometown-sno-cones"]!, name: "Cream Snowball", description: "With sweet cream drizzle and your choice of flavor", price: 5.00, category: "Snowballs" },
      { truckId: truckBySlug["hometown-sno-cones"]!, name: "Wedding Cake Snowball", description: "Vanilla almond with cream and condensed milk", price: 5.50, category: "Snowballs" },
      { truckId: truckBySlug["hometown-sno-cones"]!, name: "Fruit Punch Bomb", description: "Three-flavor combination with fresh fruit", price: 6.00, category: "Specialty" },
      { truckId: truckBySlug["hometown-sno-cones"]!, name: "Pickle Snowball", description: "Oklahoma favorite — dill pickle flavored!", price: 4.50, category: "Specialty" },

      { truckId: truckBySlug["seoul-wagon"]!, name: "Korean BBQ Taco", description: "Bulgogi beef, kimchi slaw, gochujang mayo on corn tortilla", price: 4.50, category: "Tacos" },
      { truckId: truckBySlug["seoul-wagon"]!, name: "Bibimbap Bowl", description: "Rice, mixed vegetables, gochujang, fried egg, pickled daikon", price: 13.00, category: "Bowls" },
      { truckId: truckBySlug["seoul-wagon"]!, name: "Kimchi Fries", description: "Fries topped with kimchi, cheese sauce, sriracha mayo, green onion", price: 8.00, category: "Sides" },
      { truckId: truckBySlug["seoul-wagon"]!, name: "Spicy Pork Belly Bao", description: "Steamed bun with braised pork belly, cucumber, hoisin", price: 7.00, category: "Bao" },
      { truckId: truckBySlug["seoul-wagon"]!, name: "Boba Tea", description: "Your choice of milk tea with tapioca pearls", price: 6.00, category: "Drinks" },

      { truckId: truckBySlug["boomtown-bites"]!, name: "Chicken Tender Plate", description: "Hand-battered tenders with honey mustard and fries", price: 12.00, category: "Plates" },
      { truckId: truckBySlug["boomtown-bites"]!, name: "Loaded Baked Potato", description: "With butter, sour cream, cheddar, bacon, chives", price: 9.00, category: "Sides" },
      { truckId: truckBySlug["boomtown-bites"]!, name: "Southern Mac & Cheese", description: "Four-cheese blend baked to perfection", price: 7.00, category: "Sides" },
      { truckId: truckBySlug["boomtown-bites"]!, name: "Country Fried Steak Sandwich", description: "Breaded sirloin, country gravy, pickles on Texas toast", price: 13.00, category: "Sandwiches" },
      { truckId: truckBySlug["boomtown-bites"]!, name: "Sweet Tea (32 oz)", description: "Fresh-brewed Oklahoma sweet tea", price: 3.00, category: "Drinks" },
    ]);

    await db.insert(eventsTable).values([
      {
        organizerUserId: org1,
        name: "Scissortail Park Food Truck Festival",
        slug: "scissortail-food-truck-fest",
        description: "Oklahoma City's biggest food truck gathering at the beautiful Scissortail Park. Music, food, and community.",
        venueName: "Scissortail Park",
        address: "300 SW 7th St",
        city: "Oklahoma City",
        startDateTime: new Date("2026-04-15T11:00:00Z"),
        endDateTime: new Date("2026-04-15T20:00:00Z"),
        isPublished: true,
      },
      {
        organizerUserId: org2,
        name: "Edmond Mitch Park Food Truck Rally",
        slug: "edmond-mitch-park-rally",
        description: "Edmond's monthly food truck rally at Mitch Park. Family-friendly with live music and lawn games.",
        venueName: "Mitch Park",
        address: "1501 W Edmond Rd",
        city: "Edmond",
        startDateTime: new Date("2026-04-20T12:00:00Z"),
        endDateTime: new Date("2026-04-20T19:00:00Z"),
        isPublished: true,
      },
      {
        organizerUserId: org1,
        name: "Norman Campus Eats Week",
        slug: "norman-campus-eats-week",
        description: "A week-long food truck event at the University of Oklahoma campus north oval.",
        venueName: "University North Oval",
        address: "University Blvd & W Boyd St",
        city: "Norman",
        startDateTime: new Date("2026-05-05T11:00:00Z"),
        endDateTime: new Date("2026-05-05T14:00:00Z"),
        isPublished: true,
      },
      {
        organizerUserId: org2,
        name: "Yukon Summer Nights",
        slug: "yukon-summer-nights",
        description: "An evening food truck and community event at Yukon City Park with live country music.",
        venueName: "Yukon City Park",
        address: "301 Elm Ave",
        city: "Yukon",
        startDateTime: new Date("2026-05-12T16:00:00Z"),
        endDateTime: new Date("2026-05-12T21:00:00Z"),
        isPublished: true,
      },
      {
        organizerUserId: org1,
        name: "Moore Central Park Fall Fest",
        slug: "moore-central-park-fall-fest",
        description: "Moore's annual fall festival featuring food trucks, craft vendors, and a pumpkin patch.",
        venueName: "Moore Central Park",
        address: "501 SW 4th St",
        city: "Moore",
        startDateTime: new Date("2026-06-01T10:00:00Z"),
        endDateTime: new Date("2026-06-01T20:00:00Z"),
        isPublished: true,
      },
    ]);

    logger.info("Database seeded successfully ✓");
  } catch (err) {
    logger.error({ err }, "Seed failed — continuing startup anyway");
  }
}
