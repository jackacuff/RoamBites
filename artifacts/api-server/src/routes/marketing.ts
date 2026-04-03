import { Router, type IRouter } from "express";
import { db, trucksTable, vendorSubscriptionsTable, socialPostsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import OpenAI from "openai";

const router: IRouter = Router();

function getOpenAI() {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseURL || !apiKey) throw new Error("OpenAI integration not configured");
  return new OpenAI({ baseURL, apiKey });
}

async function getVendorTruck(userId: number) {
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, userId));
  return truck ?? null;
}

async function getSubscriptionTier(userId: number): Promise<"pro" | "base" | "none"> {
  const [sub] = await db
    .select({ status: vendorSubscriptionsTable.status, trialEndsAt: vendorSubscriptionsTable.trialEndsAt, planId: vendorSubscriptionsTable.planId })
    .from(vendorSubscriptionsTable)
    .where(eq(vendorSubscriptionsTable.vendorUserId, userId));

  if (!sub) return "none";
  const isActive = sub.status === "active" || (sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt > new Date());
  if (!isActive) return "none";
  // Plan id=1 is Pro, id=3 is Base (from scratchpad)
  return sub.planId === 1 ? "pro" : "base";
}

// GET /api/vendor/marketing/brand
router.get("/vendor/marketing/brand", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }
  res.json({
    primaryColor: truck.primaryColor ?? "#FF6B35",
    secondaryColor: truck.secondaryColor ?? "#2C3E50",
    tagline: truck.tagline ?? "",
    fontStyle: truck.fontStyle ?? "modern",
    name: truck.name,
    cuisine: truck.cuisine,
    description: truck.description,
    instagramHandle: truck.instagramHandle,
    twitterHandle: truck.twitterHandle,
    logoUrl: truck.logoUrl,
    coverImageUrl: truck.coverImageUrl,
    slug: truck.slug,
    truckId: truck.id,
  });
});

// POST /api/vendor/marketing/brand
router.post("/vendor/marketing/brand", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const { primaryColor, secondaryColor, tagline, fontStyle } = req.body as {
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
    fontStyle?: string;
  };

  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (primaryColor && !colorRegex.test(primaryColor)) {
    res.status(400).json({ error: "Invalid primaryColor format (must be #RRGGBB)" }); return;
  }
  if (secondaryColor && !colorRegex.test(secondaryColor)) {
    res.status(400).json({ error: "Invalid secondaryColor format (must be #RRGGBB)" }); return;
  }

  const validFonts = ["modern", "bold", "friendly", "classic", "script"];
  if (fontStyle && !validFonts.includes(fontStyle)) {
    res.status(400).json({ error: "Invalid fontStyle" }); return;
  }

  await db.update(trucksTable).set({
    ...(primaryColor && { primaryColor }),
    ...(secondaryColor && { secondaryColor }),
    ...(typeof tagline === "string" && { tagline }),
    ...(fontStyle && { fontStyle }),
  }).where(eq(trucksTable.id, truck.id));

  res.json({ success: true });
});

// POST /api/vendor/marketing/copy
router.post("/vendor/marketing/copy", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const { templateType, customPrompt } = req.body as {
    templateType: "social" | "event" | "special" | "open-now" | "today-location" | "weekly" | "general";
    customPrompt?: string;
  };

  const prompts: Record<string, string> = {
    social: `Write an engaging Instagram caption for ${truck.name}, a food truck serving ${truck.cuisine}. ${truck.description ? `About them: ${truck.description}` : ""} Keep it under 150 words, use 3-5 relevant emojis, include 5-8 hashtags at the end. Tone: warm, exciting, community-focused.`,
    event: `Write a short event announcement post for ${truck.name} (${truck.cuisine} food truck). They're attending a local community event. Write it as if announcing their presence. Under 120 words, 3 emojis, 4 hashtags. Tone: festive and inviting.`,
    special: `Write a mouth-watering daily special announcement for ${truck.name}, a ${truck.cuisine} food truck. ${truck.description ? truck.description : ""} Make it sound irresistible. Under 100 words, include 3-4 food emojis, 4 hashtags. Tone: enthusiastic and appetizing.`,
    "open-now": `Write a short "we're open now!" social media post for ${truck.name}, a ${truck.cuisine} food truck. ${truck.description ? truck.description : ""} Create urgency and excitement. Under 80 words, 3 emojis, 3 hashtags. Tone: energetic and welcoming.`,
    "today-location": `Write a "find us today at [location]" social post for ${truck.name} (${truck.cuisine} food truck). Make it exciting and welcoming, helping followers know where to find them. Under 100 words, include 📍 emoji, location placeholder in brackets, 4 hashtags. Tone: friendly and inviting.`,
    weekly: `Write a weekly schedule announcement for ${truck.name} (${truck.cuisine} food truck). Mention that their full schedule is on RoamBites. Under 130 words, use a calendar emoji, 5 hashtags. Tone: organized and community-focused.`,
    general: customPrompt
      ? `Write marketing copy for ${truck.name} (${truck.cuisine} food truck): ${customPrompt}. Keep it under 150 words, include relevant emojis and hashtags.`
      : `Write compelling marketing copy for ${truck.name}, a ${truck.cuisine} food truck. ${truck.description ? truck.description : ""} Under 150 words, 3-5 emojis, 5 hashtags. Tone: authentic and engaging.`,
  };

  const prompt = prompts[templateType] ?? prompts["general"];

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: "You are a social media marketing expert specializing in food and restaurant promotion. Write copy that feels authentic, not corporate. Never use em dashes (—)." },
        { role: "user", content: prompt },
      ],
    });
    const copy = (completion.choices[0]?.message?.content ?? "").trim();
    res.json({ copy, templateType });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate copy: " + err.message });
  }
});

// GET /api/vendor/marketing/posts — list saved posts (queue + drafts)
router.get("/vendor/marketing/posts", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const posts = await db
    .select()
    .from(socialPostsTable)
    .where(eq(socialPostsTable.truckId, truck.id))
    .orderBy(desc(socialPostsTable.createdAt));

  res.json(posts);
});

// POST /api/vendor/marketing/posts — save post to queue/draft
router.post("/vendor/marketing/posts", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const tier = await getSubscriptionTier(req.user!.id);

  const { templateType, caption, platform, scheduledFor } = req.body as {
    templateType: string;
    caption: string;
    platform?: string;
    scheduledFor?: string;
  };

  if (!caption?.trim()) { res.status(400).json({ error: "Caption is required" }); return; }

  // Scheduling is Pro-only
  if (scheduledFor && tier !== "pro") {
    res.status(403).json({ error: "Scheduling posts requires a Pro subscription", code: "PRO_REQUIRED" }); return;
  }

  const [post] = await db.insert(socialPostsTable).values({
    truckId: truck.id,
    templateType: templateType ?? "general",
    caption: caption.trim(),
    platform: platform ?? null,
    status: scheduledFor ? "scheduled" : "draft",
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
  }).returning();

  res.json(post);
});

// DELETE /api/vendor/marketing/posts/:id — remove from queue
router.delete("/vendor/marketing/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const postId = parseInt(req.params.id, 10);
  const [post] = await db.select().from(socialPostsTable).where(
    and(eq(socialPostsTable.id, postId), eq(socialPostsTable.truckId, truck.id))
  );
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  await db.delete(socialPostsTable).where(eq(socialPostsTable.id, postId));
  res.json({ success: true });
});

// GET /api/vendor/marketing/stats — post count stats
router.get("/vendor/marketing/stats", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const allPosts = await db
    .select({ id: socialPostsTable.id, createdAt: socialPostsTable.createdAt })
    .from(socialPostsTable)
    .where(eq(socialPostsTable.truckId, truck.id));

  const postsThisMonth = allPosts.filter(p => new Date(p.createdAt) >= firstOfMonth).length;
  const postsAllTime = allPosts.length;

  res.json({ postsThisMonth, postsAllTime });
});

export default router;
