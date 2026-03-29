import { Router, type IRouter } from "express";
import { db, trucksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/vendor/marketing/brand", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }
  res.json({
    primaryColor: truck.primaryColor ?? "#FF6B35",
    secondaryColor: truck.secondaryColor ?? "#2C3E50",
    tagline: truck.tagline ?? "",
    name: truck.name,
    cuisine: truck.cuisine,
    description: truck.description,
    instagramHandle: truck.instagramHandle,
    twitterHandle: truck.twitterHandle,
    logoUrl: truck.logoUrl,
    coverImageUrl: truck.coverImageUrl,
  });
});

router.post("/vendor/marketing/brand", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const { primaryColor, secondaryColor, tagline } = req.body as {
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
  };

  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (primaryColor && !colorRegex.test(primaryColor)) {
    res.status(400).json({ error: "Invalid primaryColor format (must be #RRGGBB)" }); return;
  }
  if (secondaryColor && !colorRegex.test(secondaryColor)) {
    res.status(400).json({ error: "Invalid secondaryColor format (must be #RRGGBB)" }); return;
  }

  await db.update(trucksTable).set({
    ...(primaryColor && { primaryColor }),
    ...(secondaryColor && { secondaryColor }),
    ...(typeof tagline === "string" && { tagline }),
  }).where(eq(trucksTable.id, truck.id));

  res.json({ success: true });
});

router.post("/vendor/marketing/copy", requireAuth, async (req, res): Promise<void> => {
  const truck = await getVendorTruck(req.user!.id);
  if (!truck) { res.status(404).json({ error: "No truck found" }); return; }

  const { templateType, customPrompt } = req.body as {
    templateType: "social" | "event" | "special" | "open-now" | "general";
    customPrompt?: string;
  };

  const prompts: Record<string, string> = {
    social: `Write an engaging Instagram caption for ${truck.name}, a food truck serving ${truck.cuisine}. ${truck.description ? `About them: ${truck.description}` : ""} Keep it under 150 words, use 3-5 relevant emojis, include 5-8 hashtags at the end. Tone: warm, exciting, community-focused.`,
    event: `Write a short event announcement post for ${truck.name} (${truck.cuisine} food truck). They're attending a local community event. Write it as if announcing their presence — make people excited to come find them. Under 120 words, 3 emojis, 4 hashtags. Tone: festive and inviting.`,
    special: `Write a mouth-watering daily special announcement for ${truck.name}, a ${truck.cuisine} food truck. ${truck.description ? truck.description : ""} Make it sound irresistible. Under 100 words, include 3-4 food emojis, 4 hashtags. Tone: enthusiastic and appetizing.`,
    "open-now": `Write a short "we're open now!" social media post for ${truck.name}, a ${truck.cuisine} food truck. ${truck.description ? truck.description : ""} Create urgency and excitement. Under 80 words, 3 emojis, 3 hashtags. Tone: energetic and welcoming.`,
    general: customPrompt
      ? `Write marketing copy for ${truck.name} (${truck.cuisine} food truck): ${customPrompt}. Keep it under 150 words, include relevant emojis and hashtags.`
      : `Write compelling marketing copy for ${truck.name}, a ${truck.cuisine} food truck. ${truck.description ? truck.description : ""} Under 150 words, 3-5 emojis, 5 hashtags. Tone: authentic and engaging.`,
  };

  const prompt = prompts[templateType] ?? prompts["general"];

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: "You are a social media marketing expert specializing in food and restaurant promotion. Write copy that feels authentic, not corporate. Never use em dashes (—)." },
        { role: "user", content: prompt },
      ],
    });

    const copy = completion.choices[0]?.message?.content ?? "";
    res.json({ copy, templateType });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate copy: " + err.message });
  }
});

export default router;
