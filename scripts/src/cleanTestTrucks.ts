import { db, trucksTable, menuItemsTable, scheduleEntriesTable, truckSpecialsTable } from "@workspace/db";
import { like, eq } from "drizzle-orm";

async function main() {
  const testTrucks = await db
    .select({ id: trucksTable.id, slug: trucksTable.slug, name: trucksTable.name })
    .from(trucksTable)
    .where(like(trucksTable.slug, "yesss%"));

  if (testTrucks.length === 0) {
    console.log("No test trucks found to clean up.");
    process.exit(0);
  }

  for (const t of testTrucks) {
    console.log(`Removing test truck: ${t.name} (${t.slug})`);
    await db.delete(menuItemsTable).where(eq(menuItemsTable.truckId, t.id));
    await db.delete(scheduleEntriesTable).where(eq(scheduleEntriesTable.truckId, t.id));
    await db.delete(truckSpecialsTable).where(eq(truckSpecialsTable.truckId, t.id));
    await db.delete(trucksTable).where(eq(trucksTable.id, t.id));
    console.log(`  ✓ Deleted ${t.slug}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
