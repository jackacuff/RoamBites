import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Palette, Sparkles, Copy, Check, Instagram, Twitter,
  MapPin, Star, Calendar, Loader2, Download, RefreshCw, Save,
  Share2, ExternalLink, Facebook, Crown, Trash2, Clock, ChevronRight,
  BarChart2, Image, PlusCircle, Layers, AlertCircle, CheckCircle2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface BrandData {
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
  fontStyle: string;
  name: string;
  cuisine: string;
  description: string | null;
  instagramHandle: string | null;
  twitterHandle: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  slug: string | null;
  truckId: number | null;
}

interface SocialPost {
  id: number;
  truckId: number;
  templateType: string;
  caption: string;
  platform: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
}

interface Stats {
  postsThisMonth: number;
  postsAllTime: number;
}

// ── Font presets ─────────────────────────────────────────────────────────────
const FONTS: { id: string; label: string; family: string; weight?: number }[] = [
  { id: "modern",   label: "Modern",   family: "system-ui, -apple-system, sans-serif" },
  { id: "bold",     label: "Bold",     family: "system-ui, -apple-system, sans-serif", weight: 900 },
  { id: "friendly", label: "Friendly", family: "'Trebuchet MS', system-ui, sans-serif" },
  { id: "classic",  label: "Classic",  family: "Georgia, 'Times New Roman', serif" },
  { id: "script",   label: "Script",   family: "cursive, 'Comic Sans MS', fantasy" },
];

function getFont(fontStyle: string) {
  return FONTS.find(f => f.id === fontStyle) ?? FONTS[0];
}

// ── Template definitions ──────────────────────────────────────────────────────
type TemplateType = "social" | "open-now" | "special" | "event" | "today-location" | "weekly";

const TEMPLATES: { id: TemplateType; label: string; emoji: string; description: string; proOnly?: boolean }[] = [
  { id: "open-now",       label: "Open Now",         emoji: "🔛", description: "You're serving right now" },
  { id: "today-location", label: "Find Us Today",    emoji: "📍", description: "Drop your pin for the day" },
  { id: "special",        label: "Today's Special",  emoji: "⭐", description: "Highlight a deal or dish" },
  { id: "event",          label: "Event Night",      emoji: "🎪", description: "Announce an event appearance" },
  { id: "social",         label: "Brand Post",       emoji: "📣", description: "General brand awareness" },
  { id: "weekly",         label: "Weekly Schedule",  emoji: "📅", description: "Show your full week", proOnly: true },
];

// ── Social platforms ──────────────────────────────────────────────────────────
const buildTruckUrl = (slug: string | null) =>
  slug ? `${window.location.origin}/trucks/${slug}` : window.location.origin;

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  buildShareUrl: (caption: string, truckUrl: string) => string | null;
  appDeepLink: string | null;
  tip: string;
  stepByStep: string[];
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: <Instagram className="w-5 h-5" />,
    color: "#E1306C",
    buildShareUrl: () => null,
    appDeepLink: "instagram://",
    tip: "Caption copied — open Instagram, create a post, and paste it in.",
    stepByStep: ["Caption is copied to clipboard", "Open Instagram app", "Tap + to create a new post", "Paste your caption"],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <Facebook className="w-5 h-5" />,
    color: "#1877F2",
    buildShareUrl: (_caption, truckUrl) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(truckUrl)}`,
    appDeepLink: null,
    tip: "Opens Facebook share dialog with your RoamBites page. Add your caption in the post box.",
    stepByStep: ["Opens Facebook with your RoamBites page link", "Paste your caption into the post box", "Tap Post"],
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: <Twitter className="w-5 h-5" />,
    color: "#000000",
    buildShareUrl: (caption, truckUrl) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption.slice(0, 220))}&url=${encodeURIComponent(truckUrl)}`,
    appDeepLink: null,
    tip: "Opens X with your caption pre-filled. Just tap Post.",
    stepByStep: ["Opens X with caption pre-filled", "Review and tap Post"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <span className="text-sm font-black leading-none">TT</span>,
    color: "#010101",
    buildShareUrl: () => null,
    appDeepLink: "snssdk1233://",
    tip: "Caption copied — open TikTok, record or upload a video, and paste the caption.",
    stepByStep: ["Caption is copied to clipboard", "Open TikTok app", "Create or upload a video", "Paste your caption"],
  },
];

// ── Color utilities ───────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 255, g: 107, b: 53 };
}
function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

// ── Template card components ──────────────────────────────────────────────────
function SocialTemplate({ brand }: { brand: BrandData }) {
  const font = getFont(brand.fontStyle);
  const textColor = isLight(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  const { r: r2, g: g2, b: b2 } = hexToRgb(brand.secondaryColor);
  return (
    <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)` }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center shadow-lg" style={{ background: `rgba(${r2},${g2},${b2},0.3)`, border: `3px solid rgba(255,255,255,0.4)` }}>
          {brand.logoUrl
            ? <img src={brand.logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
            : <span className="text-3xl font-black" style={{ color: textColor }}>{brand.name.charAt(0)}</span>}
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-1" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        <p className="text-sm font-semibold uppercase tracking-widest mb-4 opacity-80" style={{ color: textColor }}>{brand.cuisine}</p>
        {brand.tagline && <p className="text-lg font-medium italic max-w-xs" style={{ color: textColor, opacity: 0.9 }}>"{brand.tagline}"</p>}
      </div>
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: `rgba(0,0,0,0.25)` }}>
        {brand.instagramHandle && <span className="text-sm font-semibold" style={{ color: textColor, opacity: 0.9 }}>@{brand.instagramHandle}</span>}
        <div className="flex items-center gap-2 ml-auto">
          <MapPin className="w-3.5 h-3.5 opacity-70" style={{ color: textColor }} />
          <span className="text-xs font-medium opacity-70" style={{ color: textColor }}>Find us on RoamBites</span>
        </div>
      </div>
    </div>
  );
}

function OpenNowTemplate({ brand }: { brand: BrandData }) {
  const font = getFont(brand.fontStyle);
  const textColor = isLight(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ background: brand.secondaryColor }}>
      <div className="px-8 py-6" style={{ background: brand.primaryColor }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: textColor, opacity: 0.85 }}>Open Now</span>
        </div>
        <h2 className="text-4xl font-black tracking-tight" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        <p className="text-sm font-semibold uppercase tracking-wider mt-1" style={{ color: textColor, opacity: 0.75 }}>{brand.cuisine}</p>
      </div>
      <div className="px-8 py-6">
        <p className="text-lg font-medium leading-relaxed mb-6" style={{ color: isLight(brand.secondaryColor) ? "#374151" : "#e5e7eb" }}>{brand.tagline || brand.description || `Fresh ${brand.cuisine} served with love. Come find us today!`}</p>
        <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: `rgba(128,128,128,0.3)` }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg" style={{ background: brand.primaryColor, color: textColor }}>
            {brand.logoUrl ? <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover" /> : brand.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: isLight(brand.secondaryColor) ? "#111" : "#fff" }}>{brand.name}</p>
            {brand.instagramHandle && <p className="text-xs opacity-60" style={{ color: isLight(brand.secondaryColor) ? "#555" : "#aaa" }}>@{brand.instagramHandle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecialTemplate({ brand }: { brand: BrandData }) {
  const font = getFont(brand.fontStyle);
  const textColor = isLight(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  const { r, g, b } = hexToRgb(brand.primaryColor);
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ border: `3px solid ${brand.primaryColor}` }}>
      <div className="px-8 py-5 flex items-center justify-between" style={{ background: brand.primaryColor }}>
        <div>
          <p className="text-xs font-black uppercase tracking-widest opacity-80" style={{ color: textColor }}>Today's Special</p>
          <h2 className="text-2xl font-black" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2" style={{ background: `rgba(255,255,255,0.2)`, borderColor: `rgba(255,255,255,0.4)`, color: textColor }}>
          {brand.logoUrl ? <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover" /> : brand.name.charAt(0)}
        </div>
      </div>
      <div className="px-8 py-7 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3"><Star className="w-5 h-5 fill-current" style={{ color: brand.primaryColor }} /><span className="font-bold text-lg" style={{ color: brand.primaryColor }}>Featured Item</span></div>
        <p className="text-2xl font-black text-gray-900 dark:text-white mb-2">Check our menu for today's specials!</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{brand.cuisine} · Made fresh daily</p>
        <div className="rounded-xl py-3 px-5 text-center font-bold text-sm" style={{ background: `rgba(${r},${g},${b},0.1)`, color: brand.primaryColor }}>
          Find us on RoamBites {brand.instagramHandle ? `· @${brand.instagramHandle}` : ""}
        </div>
      </div>
    </div>
  );
}

function EventTemplate({ brand }: { brand: BrandData }) {
  const font = getFont(brand.fontStyle);
  const textColor = isLight(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: brand.secondaryColor }}>
      <div className="relative px-8 pt-8 pb-6" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>Live Event</span>
        </div>
        <Calendar className="w-8 h-8 mb-3" style={{ color: textColor, opacity: 0.8 }} />
        <h2 className="text-3xl font-black tracking-tight" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        <p className="text-sm font-semibold opacity-80 mt-1" style={{ color: textColor }}>Will be there!</p>
      </div>
      <div className="px-8 py-6">
        <p className="text-base font-medium leading-relaxed mb-4" style={{ color: isLight(brand.secondaryColor) ? "#374151" : "#e5e7eb" }}>Come taste our {brand.cuisine.toLowerCase()} at the event! {brand.tagline || "We can't wait to see you there."}</p>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: brand.primaryColor }}><MapPin className="w-4 h-4" /><span>Track us live on RoamBites</span></div>
      </div>
    </div>
  );
}

function TodayLocationTemplate({ brand }: { brand: BrandData }) {
  const font = getFont(brand.fontStyle);
  const textColor = isLight(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ border: `3px solid ${brand.primaryColor}` }}>
      <div className="px-8 py-6 flex items-center gap-4" style={{ background: brand.primaryColor }}>
        <div className="text-3xl">📍</div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest opacity-80" style={{ color: textColor }}>Find Us Today</p>
          <h2 className="text-2xl font-black leading-tight" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        </div>
      </div>
      <div className="px-8 py-6 bg-white dark:bg-gray-900">
        <div className="rounded-xl border-2 border-dashed p-4 mb-4 text-center" style={{ borderColor: brand.primaryColor }}>
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">📍 [Update with your location in the caption]</p>
        </div>
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-4">{brand.tagline || `Come find ${brand.cuisine} in your neighborhood!`}</p>
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: brand.primaryColor }}><MapPin className="w-4 h-4" /><span>Full schedule on RoamBites</span></div>
      </div>
    </div>
  );
}

function WeeklyTemplate({ brand }: { brand: BrandData }) {
  const font = getFont(brand.fontStyle);
  const textColor = isLight(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl">
      <div className="px-8 py-5" style={{ background: brand.primaryColor }}>
        <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1" style={{ color: textColor }}>Weekly Schedule</p>
        <h2 className="text-2xl font-black" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        <p className="text-sm opacity-80 mt-0.5" style={{ color: textColor }}>{brand.cuisine}</p>
      </div>
      <div className="px-6 py-5 bg-white dark:bg-gray-900">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {days.map((d, i) => (
            <div key={d} className={`text-center py-2 rounded-lg text-xs font-bold ${i < 5 ? "opacity-100" : "opacity-50"}`} style={{ background: `${brand.primaryColor}18`, color: brand.primaryColor }}>
              <div>{d}</div>
              <div className="mt-1 text-[10px] font-normal text-gray-400">{i < 6 ? "Open" : "Rest"}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Full schedule on RoamBites</span>
          <span className="font-bold" style={{ color: brand.primaryColor }}>→</span>
        </div>
      </div>
    </div>
  );
}

function renderTemplate(type: TemplateType, brand: BrandData) {
  switch (type) {
    case "social":         return <SocialTemplate brand={brand} />;
    case "open-now":       return <OpenNowTemplate brand={brand} />;
    case "special":        return <SpecialTemplate brand={brand} />;
    case "event":          return <EventTemplate brand={brand} />;
    case "today-location": return <TodayLocationTemplate brand={brand} />;
    case "weekly":         return <WeeklyTemplate brand={brand} />;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
type ActiveTab = "create" | "queue" | "brand";

export default function VendorMarketing() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>("create");

  // Create tab state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("open-now");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const [activePlatformTip, setActivePlatformTip] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Brand Kit local state
  const [localColors, setLocalColors] = useState({ primary: "#FF6B35", secondary: "#2C3E50" });
  const [localTagline, setLocalTagline] = useState("");
  const [localFontStyle, setLocalFontStyle] = useState("modern");

  // Queue tab state
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [deletingPost, setDeletingPost] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (user && user.role !== "vendor" && user.role !== "admin" && user.role !== "superadmin") { navigate("/"); }
  }, [isAuthenticated, user]);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(getApiUrl(`/api/vendor/marketing/brand`), { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(getApiUrl(`/api/vendor/subscription`), { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(getApiUrl(`/api/vendor/marketing/stats`), { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([brandData, subData, statsData]) => {
        setBrand(brandData as BrandData);
        setLocalColors({ primary: brandData.primaryColor, secondary: brandData.secondaryColor });
        setLocalTagline(brandData.tagline ?? "");
        setLocalFontStyle(brandData.fontStyle ?? "modern");
        if (subData) {
          const planName = (subData.planName ?? "").toLowerCase();
          setIsPro(planName.includes("pro") && (subData.status === "active" || subData.status === "trialing"));
        }
        if (statsData) setStats(statsData as Stats);
      })
      .catch(() => toast({ title: "Could not load brand data", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  // ── Load post queue ────────────────────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/posts`), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPosts(await res.json());
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // ── Preview brand (unsaved local edits reflected live) ─────────────────────
  const previewBrand: BrandData | null = brand
    ? { ...brand, primaryColor: localColors.primary, secondaryColor: localColors.secondary, tagline: localTagline, fontStyle: localFontStyle }
    : null;

  // ── Generate AI caption ────────────────────────────────────────────────────
  async function generateCopy(templateId: TemplateType) {
    setSelectedTemplate(templateId);
    setGeneratedCopy("");
    setCopiedCaption(false);
    setActivePlatformTip(null);
    setGeneratingCopy(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/copy`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateType: templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setGeneratedCopy(data.copy);
    } catch (err: any) {
      toast({ title: "Could not generate caption", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingCopy(false);
    }
  }

  // ── Copy caption ───────────────────────────────────────────────────────────
  async function copyCaption(text?: string) {
    const t = text ?? generatedCopy;
    if (!t) { toast({ title: "Generate a caption first" }); return; }
    await navigator.clipboard.writeText(t);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    toast({ title: "Caption copied to clipboard!" });
  }

  // ── Save to queue ──────────────────────────────────────────────────────────
  async function saveToQueue() {
    if (!generatedCopy.trim()) { toast({ title: "Generate a caption first", variant: "destructive" }); return; }
    setSavingPost(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/posts`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateType: selectedTemplate, caption: generatedCopy }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to save"); }
      toast({ title: "Saved to queue!", description: "Find it in the Queue tab." });
      loadPosts();
      if (stats) setStats(s => s ? { ...s, postsThisMonth: s.postsThisMonth + 1, postsAllTime: s.postsAllTime + 1 } : s);
    } catch (err: any) {
      toast({ title: "Could not save to queue", description: err.message, variant: "destructive" });
    } finally {
      setSavingPost(false);
    }
  }

  // ── Delete post ────────────────────────────────────────────────────────────
  async function deletePost(id: number) {
    setDeletingPost(id);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/posts/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setPosts(p => p.filter(x => x.id !== id));
      toast({ title: "Post removed from queue" });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    } finally {
      setDeletingPost(null);
    }
  }

  // ── Share to platform ──────────────────────────────────────────────────────
  async function handlePlatformShare(platform: Platform) {
    setShareLoading(platform.id);
    setActivePlatformTip(platform.id);

    const caption = generatedCopy || `${brand?.name} — ${brand?.tagline || brand?.cuisine || ""}\n\nFind us on RoamBites: ${buildTruckUrl(brand?.slug ?? null)}`;
    const truckUrl = buildTruckUrl(brand?.slug ?? null);
    const shareUrl = platform.buildShareUrl(caption, truckUrl);

    // Always copy caption first (useful for all platforms)
    try {
      await navigator.clipboard.writeText(caption);
    } catch { /* ignore clipboard errors */ }

    if (shareUrl) {
      // Has a web share URL — open it
      window.open(shareUrl, "_blank", "width=650,height=600,noopener,noreferrer");
    } else if (platform.appDeepLink) {
      // No web URL — try app deep link
      window.location.href = platform.appDeepLink;
      // Fallback: show tip (already shown via activePlatformTip)
    }

    setTimeout(() => setShareLoading(null), 800);
  }

  // ── Print/download template ────────────────────────────────────────────────
  function printTemplate() {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${brand?.name ?? ""} – Marketing</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;font-family:system-ui,sans-serif;}.card{max-width:480px;width:100%;}@media print{body{background:white;}}</style></head><body><div class="card">${node.innerHTML}</div><script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    win.document.close();
  }

  // ── Save brand kit ─────────────────────────────────────────────────────────
  async function saveBrand() {
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/brand`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ primaryColor: localColors.primary, secondaryColor: localColors.secondary, tagline: localTagline, fontStyle: localFontStyle }),
      });
      if (!res.ok) throw new Error("Save failed");
      setBrand(b => b ? { ...b, primaryColor: localColors.primary, secondaryColor: localColors.secondary, tagline: localTagline, fontStyle: localFontStyle } : b);
      toast({ title: "Brand kit saved!" });
    } catch {
      toast({ title: "Failed to save brand kit", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;
  if (!brand) return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-semibold text-foreground mb-2">No truck profile found</p>
        <p className="text-sm text-muted-foreground mb-4">Set up your truck profile first, then come back here to create content.</p>
        <a href="/vendor/truck" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">Set Up Truck →</a>
      </div>
    </Layout>
  );

  const selectedTmpl = TEMPLATES.find(t => t.id === selectedTemplate)!;
  const truckUrl = buildTruckUrl(brand.slug);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Social Media Hub</h1>
                {isPro && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold"><Crown className="w-3 h-3" /> Pro</span>}
              </div>
              <p className="text-sm text-muted-foreground">{brand.name} · create, save, and share branded content</p>
            </div>
          </div>
          {stats && (
            <div className="flex items-center gap-4 bg-muted/40 rounded-xl px-4 py-2 border border-border text-sm shrink-0">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BarChart2 className="w-4 h-4" />
                <span className="font-semibold text-foreground">{stats.postsThisMonth}</span>
                <span>this month</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">{stats.postsAllTime}</span> total
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-muted/50 rounded-xl p-1 w-fit border border-border">
          {([
            { id: "create" as ActiveTab, label: "Create",    icon: <Sparkles className="w-4 h-4" /> },
            { id: "queue"  as ActiveTab, label: `Queue${posts.length > 0 ? ` (${posts.length})` : ""}`, icon: <Layers className="w-4 h-4" /> },
            { id: "brand"  as ActiveTab, label: "Brand Kit", icon: <Palette className="w-4 h-4" /> },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: CREATE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Left column: template picker + caption ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Step 1: Pick your post type */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Step 1 — Pick a post type</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => {
                    const isProTemplate = t.proOnly && !isPro;
                    const isSelected = selectedTemplate === t.id;
                    return (
                      <button key={t.id}
                        onClick={() => !isProTemplate && generateCopy(t.id)}
                        disabled={isProTemplate || generatingCopy}
                        className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/40"
                        } ${isProTemplate ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {isProTemplate && <Crown className="absolute top-2 right-2 w-3 h-3 text-amber-500" />}
                        <div className={`text-xl shrink-0 ${generatingCopy && isSelected ? "opacity-0" : ""}`}>{t.emoji}</div>
                        {generatingCopy && isSelected && (
                          <div className="absolute left-4">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-bold leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!isPro && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" /> Weekly Schedule requires Pro
                  </p>
                )}
              </div>

              {/* Step 2: AI caption */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step 2 — Your caption</p>
                  {generatedCopy && (
                    <button onClick={() => generateCopy(selectedTemplate)} disabled={generatingCopy}
                      className="flex items-center gap-1 text-xs text-primary hover:opacity-80 disabled:opacity-40">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  )}
                </div>

                {generatingCopy ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm">Writing your {selectedTmpl.label} caption…</p>
                  </div>
                ) : generatedCopy ? (
                  <>
                    <div className="relative mb-3">
                      <textarea
                        value={generatedCopy}
                        onChange={e => setGeneratedCopy(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-muted/30 resize-none min-h-[140px] text-foreground leading-relaxed pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button onClick={() => copyCaption()}
                        className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Copy caption">
                        {copiedCaption ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveToQueue} disabled={savingPost}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors">
                        {savingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        {savingPost ? "Saving…" : "Save to Queue"}
                      </button>
                      <button onClick={printTemplate}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Pick a post type above to auto-generate your caption</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right column: preview + share ── */}
            <div className="lg:col-span-3 space-y-5">
              <div className="sticky top-24 space-y-5">

                {/* Card preview */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Card Preview</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedTmpl.emoji} {selectedTmpl.label} · live preview</p>
                    </div>
                    <button onClick={printTemplate}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>
                  <div ref={printRef} className="max-w-md mx-auto">
                    {previewBrand && renderTemplate(selectedTemplate, previewBrand)}
                  </div>
                </div>

                {/* Share to platforms */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Step 3 — Share it</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {generatedCopy ? "Caption is ready — choose where to post it." : "Generate a caption in Step 2 first, then share."}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {PLATFORMS.map(platform => {
                      const hasShareUrl = !!platform.buildShareUrl("x", "x");
                      const isActive = activePlatformTip === platform.id;
                      return (
                        <div key={platform.id}>
                          <button
                            onClick={() => handlePlatformShare(platform)}
                            disabled={shareLoading === platform.id}
                            className={`w-full group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                              isActive ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:shadow-sm"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform" style={{ background: platform.color }}>
                              {shareLoading === platform.id ? <Loader2 className="w-4 h-4 animate-spin" /> : platform.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{platform.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {hasShareUrl ? "Opens post dialog" : "Copies caption + opens app"}
                              </p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          </button>

                          {/* Step-by-step instructions after clicking */}
                          {isActive && (
                            <div className="mt-2 px-3 py-2.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1">
                              {platform.stepByStep.map((step, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">{step}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Truck link for sharing */}
                  {brand.slug && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1.5">Your RoamBites page (shared with all posts):</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-foreground font-mono flex-1 truncate bg-muted/50 rounded-lg px-3 py-2 border border-border">{truckUrl}</p>
                        <button onClick={() => { navigator.clipboard.writeText(truckUrl); toast({ title: "Link copied!" }); }}
                          className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors shrink-0">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: QUEUE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "queue" && (
          <div className="max-w-2xl space-y-4">
            <div className="mb-2">
              <h2 className="font-semibold text-foreground">Saved Posts</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Captions you've generated and saved. Copy them when you're ready to post.</p>
            </div>

            {postsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary/50" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">No saved posts yet</p>
                <p className="text-sm text-muted-foreground mt-1">Go to Create, pick a post type, and click "Save to Queue"</p>
                <button onClick={() => setActiveTab("create")}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">
                  Create a Post →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => {
                  const tmpl = TEMPLATES.find(t => t.id === post.templateType);
                  return (
                    <div key={post.id} className="bg-card border border-border rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl shrink-0 mt-0.5">{tmpl?.emoji ?? "📝"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-foreground">{tmpl?.label ?? post.templateType}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.status === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                              {post.status === "scheduled" ? "Scheduled" : "Draft"}
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed line-clamp-3">{post.caption}</p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(post.createdAt), "MMM d · h:mm a")}
                            {post.platform && ` · ${post.platform}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => copyCaption(post.caption)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy caption">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => deletePost(post.id)} disabled={deletingPost === post.id}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                            {deletingPost === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isPro && posts.length > 0 && (
              <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-3">
                <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Upgrade to Pro to schedule posts</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Pro vendors can set specific times to be reminded to publish their posts.</p>
                </div>
                <a href="/pricing" className="text-xs font-bold text-amber-700 dark:text-amber-400 underline shrink-0">Upgrade</a>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: BRAND KIT
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "brand" && (
          <div className="max-w-2xl space-y-6">

            {/* Logo & Cover */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Image className="w-4 h-4 text-primary" /><h2 className="font-semibold text-foreground">Brand Assets</h2></div>
                <a href="/vendor/branding" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Manage uploads <ChevronRight className="w-4 h-4" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-xl overflow-hidden bg-muted aspect-square flex items-center justify-center">
                  {brand.logoUrl
                    ? <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <div className="text-center p-4"><div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2"><span className="text-2xl font-black text-primary">{brand.name.charAt(0)}</span></div><p className="text-xs text-muted-foreground">No logo yet</p></div>}
                </div>
                <div className="border rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                  {brand.coverImageUrl
                    ? <img src={brand.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    : <div className="text-center p-4"><Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" /><p className="text-xs text-muted-foreground">No cover yet</p></div>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Upload your logo and cover on the <a href="/vendor/branding" className="text-primary hover:underline">Brand & Media</a> page
              </p>
            </div>

            {/* Colors */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4"><Palette className="w-4 h-4 text-primary" /><h2 className="font-semibold text-foreground">Brand Colors</h2></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={localColors.primary} onChange={e => setLocalColors(c => ({ ...c, primary: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border border-border shrink-0" />
                    <input type="text" value={localColors.primary}
                      onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLocalColors(c => ({ ...c, primary: v })); }}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Secondary</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={localColors.secondary} onChange={e => setLocalColors(c => ({ ...c, secondary: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border border-border shrink-0" />
                    <input type="text" value={localColors.secondary}
                      onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLocalColors(c => ({ ...c, secondary: v })); }}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Tagline / Slogan</label>
              <input type="text" value={localTagline} onChange={e => setLocalTagline(e.target.value)} maxLength={120}
                placeholder="e.g. Find your flavor, wherever you roam"
                className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <p className="text-xs text-muted-foreground mt-2">{localTagline.length}/120 · Used in all card templates</p>
            </div>

            {/* Font Style */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Font Style</label>
                {!isPro && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Crown className="w-3 h-3" /> Pro only</span>}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {FONTS.map(f => (
                  <button key={f.id}
                    onClick={() => isPro && setLocalFontStyle(f.id)}
                    disabled={!isPro}
                    className={`py-3 px-2 rounded-xl border text-center text-xs font-medium transition-all ${localFontStyle === f.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"} ${!isPro ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={{ fontFamily: f.family, fontWeight: f.weight }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Live Preview</p>
              {previewBrand && <div className="max-w-sm mx-auto">{renderTemplate("social", previewBrand)}</div>}
            </div>

            {/* Save */}
            <button onClick={saveBrand} disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving…" : "Save Brand Kit"}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
