import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Palette, Sparkles, Copy, Check, Printer, Instagram, Twitter,
  MapPin, Star, Calendar, Zap, Loader2, Download, RefreshCw, Save, Lock,
  Share2, ExternalLink, Facebook, Crown, Trash2, Clock, ChevronRight,
  BarChart2, Type, Image, PlusCircle, SendHorizontal, Layers,
} from "lucide-react";

// ── Brand data ─────────────────────────────────────────────────────────────
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

// ── Font presets ────────────────────────────────────────────────────────────
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

// ── Template types ──────────────────────────────────────────────────────────
type TemplateType = "social" | "open-now" | "special" | "event" | "today-location" | "weekly";

const TEMPLATES: { id: TemplateType; label: string; emoji: string; description: string; proOnly?: boolean }[] = [
  { id: "social",         label: "Brand Card",      emoji: "🃏", description: "Instagram & Facebook ready" },
  { id: "open-now",       label: "Open Now",         emoji: "🔛", description: "Announce you're serving" },
  { id: "special",        label: "Daily Special",    emoji: "⭐", description: "Highlight today's special" },
  { id: "event",          label: "Event Night",      emoji: "🎪", description: "Event attendance card" },
  { id: "today-location", label: "Today's Location", emoji: "📍", description: "Pin your spot for the day" },
  { id: "weekly",         label: "Weekly Schedule",  emoji: "📅", description: "Show your week at a glance", proOnly: true },
];

const QUICK_ACTIONS: { id: TemplateType; label: string; prompt: string }[] = [
  { id: "open-now",       label: "🔛 Open Now",      prompt: "We're open and serving!" },
  { id: "special",        label: "⭐ Today's Special", prompt: "Today's special deal" },
  { id: "today-location", label: "📍 Find Us Today",  prompt: "Today's location" },
  { id: "event",          label: "🎪 Event Night",    prompt: "We're at an event tonight!" },
  { id: "weekly",         label: "📅 Weekly Sched",   prompt: "Weekly schedule" },
  { id: "social",         label: "📣 Brand Post",     prompt: "General brand awareness post" },
];

// ── Social platforms ────────────────────────────────────────────────────────
interface Platform { id: string; name: string; icon: React.ReactNode; color: string; shareUrl: (c: string, u: string) => string | null; appDeepLink: string | null; tip: string; }

const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", icon: <Instagram className="w-5 h-5" />, color: "#E1306C", shareUrl: () => null, appDeepLink: "instagram://", tip: "Caption is copied — paste it in Instagram." },
  { id: "facebook",  name: "Facebook",  icon: <Facebook className="w-5 h-5" />,  color: "#1877F2", shareUrl: (c, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}&quote=${encodeURIComponent(c)}`, appDeepLink: null, tip: "Opens Facebook with caption pre-filled." },
  { id: "tiktok",    name: "TikTok",    icon: <span className="text-sm font-black leading-none">TT</span>, color: "#010101", shareUrl: () => null, appDeepLink: "tiktok://", tip: "Caption is copied — paste it in TikTok." },
  { id: "twitter",   name: "X (Twitter)", icon: <Twitter className="w-5 h-5" />, color: "#000000", shareUrl: (c, u) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(c.slice(0, 240))}&url=${encodeURIComponent(u)}`, appDeepLink: null, tip: "Opens X with your caption pre-filled." },
];

// ── Color utilities ─────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 255, g: 107, b: 53 };
}
function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

// ── Template card components ────────────────────────────────────────────────
function SocialTemplate({ brand }: { brand: BrandData }) {
  const font = getFont(brand.fontStyle);
  const textColor = isLight(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  const { r: r2, g: g2, b: b2 } = hexToRgb(brand.secondaryColor);
  return (
    <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)` }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center shadow-lg" style={{ background: `rgba(${r2},${g2},${b2},0.3)`, border: `3px solid rgba(255,255,255,0.4)` }}>
          {brand.logoUrl ? <img src={brand.logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" /> : <span className="text-3xl font-black" style={{ color: textColor }}>{brand.name.charAt(0)}</span>}
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-1" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        <p className="text-sm font-semibold uppercase tracking-widest mb-4 opacity-80" style={{ color: textColor }}>{brand.cuisine}</p>
        {brand.tagline && <p className="text-lg font-medium italic max-w-xs" style={{ color: textColor, opacity: 0.9 }}>"{brand.tagline}"</p>}
      </div>
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: `rgba(0,0,0,0.25)` }}>
        {brand.instagramHandle && <span className="text-sm font-semibold" style={{ color: textColor, opacity: 0.9 }}>@{brand.instagramHandle}</span>}
        <div className="flex items-center gap-2 ml-auto"><MapPin className="w-3.5 h-3.5 opacity-70" style={{ color: textColor }} /><span className="text-xs font-medium opacity-70" style={{ color: textColor }}>Find us on RoamBites</span></div>
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
        <div className="flex items-center gap-3 mb-1"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span className="text-sm font-bold uppercase tracking-widest" style={{ color: textColor, opacity: 0.85 }}>Open Now</span></div>
        <h2 className="text-4xl font-black tracking-tight" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        <p className="text-sm font-semibold uppercase tracking-wider mt-1" style={{ color: textColor, opacity: 0.75 }}>{brand.cuisine}</p>
      </div>
      <div className="px-8 py-6">
        <p className="text-lg font-medium leading-relaxed mb-6" style={{ color: isLight(brand.secondaryColor) ? "#374151" : "#e5e7eb" }}>{brand.tagline || brand.description || `Fresh ${brand.cuisine} served with love. Come find us today!`}</p>
        <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: `rgba(128,128,128,0.3)` }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg" style={{ background: brand.primaryColor, color: textColor }}>{brand.logoUrl ? <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover" /> : brand.name.charAt(0)}</div>
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
        <div><p className="text-xs font-black uppercase tracking-widest opacity-80" style={{ color: textColor }}>Today's Special</p><h2 className="text-2xl font-black" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2></div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2" style={{ background: `rgba(255,255,255,0.2)`, borderColor: `rgba(255,255,255,0.4)`, color: textColor }}>{brand.logoUrl ? <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover" /> : brand.name.charAt(0)}</div>
      </div>
      <div className="px-8 py-7 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3"><Star className="w-5 h-5 fill-current" style={{ color: brand.primaryColor }} /><span className="font-bold text-lg" style={{ color: brand.primaryColor }}>Featured Item</span></div>
        <p className="text-2xl font-black text-gray-900 dark:text-white mb-2">Check our menu for today's specials!</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{brand.cuisine} · Made fresh daily</p>
        <div className="rounded-xl py-3 px-5 text-center font-bold text-sm" style={{ background: `rgba(${r},${g},${b},0.1)`, color: brand.primaryColor }}>Find us on RoamBites {brand.instagramHandle ? `· @${brand.instagramHandle}` : ""}</div>
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
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1"><span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>Live Event</span></div>
        <Calendar className="w-8 h-8 mb-3" style={{ color: textColor, opacity: 0.8 }} />
        <h2 className="text-3xl font-black tracking-tight" style={{ color: textColor, fontFamily: font.family, fontWeight: font.weight }}>{brand.name}</h2>
        <p className="text-sm font-semibold opacity-80 mt-1" style={{ color: textColor }}>Will be there!</p>
      </div>
      <div className="px-8 py-6">
        <p className="text-base font-medium leading-relaxed mb-4" style={{ color: isLight(brand.secondaryColor) ? "#374151" : "#e5e7eb" }}>Come taste our {brand.cuisine.toLowerCase()} at the event! {brand.tagline || "We can't wait to see you there."}</p>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: brand.primaryColor }}><MapPin className="w-4 h-4" /><span>Track us live on RoamBites</span></div>
        {(brand.instagramHandle || brand.twitterHandle) && (
          <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: isLight(brand.secondaryColor) ? "#6b7280" : "#9ca3af" }}>
            {brand.instagramHandle && <span>📸 @{brand.instagramHandle}</span>}
            {brand.twitterHandle && <span>𝕏 @{brand.twitterHandle}</span>}
          </div>
        )}
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
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">📍 [Your Location Today]</p>
          <p className="text-xs text-gray-400 mt-1">Update in the caption</p>
        </div>
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-4">{brand.tagline || `Come find {brand.cuisine} in your neighborhood!`}</p>
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
              <div className="mt-1 text-[10px] font-normal text-gray-400">{i < 5 ? "Open" : i === 5 ? "Open" : "Rest"}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700 dark:text-gray-300">See our full schedule</span>
          <span className="font-bold" style={{ color: brand.primaryColor }}>RoamBites →</span>
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

// ── Main component ──────────────────────────────────────────────────────────
type ActiveTab = "create" | "queue" | "brand";

export default function VendorMarketing() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPro, setIsPro] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");

  // Create tab state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("social");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Brand Kit local state (separate from committed brand)
  const [localColors, setLocalColors] = useState({ primary: "#FF6B35", secondary: "#2C3E50" });
  const [localTagline, setLocalTagline] = useState("");
  const [localFontStyle, setLocalFontStyle] = useState("modern");

  // Queue tab state
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [deletingPost, setDeletingPost] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // ── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (user && user.role !== "vendor" && user.role !== "admin" && user.role !== "superadmin") { navigate("/"); return; }
  }, [isAuthenticated, user]);

  // ── Load brand data ──────────────────────────────────────────────────────
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

  // ── Load post queue ──────────────────────────────────────────────────────
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

  // ── Derived preview brand (unsaved local edits) ──────────────────────────
  const previewBrand: BrandData | null = brand
    ? { ...brand, primaryColor: localColors.primary, secondaryColor: localColors.secondary, tagline: localTagline, fontStyle: localFontStyle }
    : null;

  // ── Save brand kit ───────────────────────────────────────────────────────
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

  // ── Generate AI copy ─────────────────────────────────────────────────────
  async function generateCopy(templateId?: TemplateType) {
    const tmpl = templateId ?? selectedTemplate;
    if (templateId) setSelectedTemplate(templateId);
    setGeneratingCopy(true);
    setGeneratedCopy("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/copy`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateType: tmpl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setGeneratedCopy(data.copy);
    } catch (err: any) {
      toast({ title: "Could not generate copy", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingCopy(false);
    }
  }

  // ── Copy caption to clipboard ────────────────────────────────────────────
  async function copyCaption() {
    const text = generatedCopy || `${brand?.name} — ${brand?.tagline || brand?.cuisine || ""}\n\nFind us on RoamBites!`;
    if (navigator.canShare && navigator.canShare({ text })) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Caption copied!" });
  }

  // ── Save to queue ────────────────────────────────────────────────────────
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
      toast({ title: "Saved to queue!", description: "View it in the Queue tab." });
      loadPosts();
      if (stats) setStats(s => s ? { ...s, postsThisMonth: s.postsThisMonth + 1, postsAllTime: s.postsAllTime + 1 } : s);
    } catch (err: any) {
      toast({ title: "Could not save to queue", description: err.message, variant: "destructive" });
    } finally {
      setSavingPost(false);
    }
  }

  // ── Delete post ──────────────────────────────────────────────────────────
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

  // ── Platform share ───────────────────────────────────────────────────────
  async function handlePlatformShare(platform: Platform) {
    setShareLoading(platform.id);
    const caption = generatedCopy || `${brand?.name} — ${brand?.tagline || brand?.cuisine || ""}\n\nFind us on RoamBites!`;
    const url = window.location.origin;
    const shareUrl = platform.shareUrl(caption, url);
    if (!shareUrl) {
      await navigator.clipboard.writeText(caption);
      toast({ title: `Caption copied!`, description: platform.tip });
      if (platform.appDeepLink) setTimeout(() => window.open(platform.appDeepLink!, "_blank"), 300);
    } else {
      window.open(shareUrl, "_blank", "width=600,height=500");
    }
    setShareLoading(null);
  }

  // ── Print/download template ──────────────────────────────────────────────
  function printTemplate() {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${brand?.name ?? ""} – Marketing</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;font-family:system-ui,sans-serif;}.card{max-width:480px;width:100%;}@media print{body{background:white;}}</style></head><body><div class="card">${node.innerHTML}</div><script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    win.document.close();
  }

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;
  if (!brand) return <Layout><div className="max-w-2xl mx-auto px-4 py-16 text-center"><p className="text-muted-foreground">No truck profile found. Please set up your truck first.</p></div></Layout>;

  const templateLabel = TEMPLATES.find(t => t.id === selectedTemplate)?.label ?? "Content";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
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

          {/* Stats bar */}
          {stats && (
            <div className="flex items-center gap-4 bg-muted/40 rounded-xl px-4 py-2 border border-border text-sm flex-shrink-0">
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

        {/* Tabs */}
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

        {/* ── TAB: CREATE ─────────────────────────────────────────────────── */}
        {activeTab === "create" && (
          <>
            {/* Quick actions */}
            <div className="mb-6 bg-card rounded-2xl border border-border p-5">
              <h2 className="font-semibold text-foreground mb-0.5">Quick Post</h2>
              <p className="text-xs text-muted-foreground mb-4">Pick a type to instantly generate a branded card + caption</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {QUICK_ACTIONS.map(qa => {
                  const tmpl = TEMPLATES.find(t => t.id === qa.id);
                  const isProTemplate = tmpl?.proOnly && !isPro;
                  return (
                    <button key={qa.id} onClick={() => !isProTemplate && generateCopy(qa.id)} disabled={generatingCopy || isProTemplate}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${selectedTemplate === qa.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"} ${isProTemplate ? "opacity-50 cursor-not-allowed" : ""}`}>
                      {isProTemplate && <Crown className="absolute top-1.5 right-1.5 w-3 h-3 text-amber-500" />}
                      {generatingCopy && selectedTemplate === qa.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <span className="text-xl">{qa.label.split(" ")[0]}</span>}
                      <span className="text-xs font-semibold text-foreground leading-tight">{qa.label.split(" ").slice(1).join(" ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: template picker + caption */}
              <div className="lg:col-span-2 space-y-5">

                {/* Template grid */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Template</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map(t => {
                      const isProTemplate = t.proOnly && !isPro;
                      return (
                        <button key={t.id} onClick={() => { if (!isProTemplate) { setSelectedTemplate(t.id); setGeneratedCopy(""); } }}
                          disabled={isProTemplate}
                          className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${selectedTemplate === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"} ${isProTemplate ? "opacity-50 cursor-not-allowed" : ""}`}>
                          {isProTemplate && <Crown className="absolute top-2 right-2 w-3.5 h-3.5 text-amber-500" />}
                          <div className={`text-xl mb-1 ${selectedTemplate === t.id ? "text-primary" : "text-muted-foreground"}`}>{t.emoji}</div>
                          <p className={`text-xs font-semibold ${selectedTemplate === t.id ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">{t.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Caption Generator */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><h2 className="font-semibold text-foreground">Caption Generator</h2></div>
                    {!isPro && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Crown className="w-3 h-3" /> Pro</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Auto-generate a caption matched to your brand voice.</p>
                  <button onClick={() => generateCopy()} disabled={generatingCopy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 disabled:opacity-50 mb-3">
                    {generatingCopy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {generatingCopy ? "Generating…" : `Generate ${templateLabel} Caption`}
                  </button>

                  {generatedCopy && (
                    <div className="relative">
                      <textarea value={generatedCopy} onChange={e => setGeneratedCopy(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-muted/30 resize-none min-h-[130px] text-foreground leading-relaxed pr-16" />
                      <button onClick={copyCaption} className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground hover:bg-muted">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  )}
                  {!generatedCopy && (
                    <button onClick={copyCaption} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted">
                      <Copy className="w-4 h-4" /> Copy basic caption
                    </button>
                  )}

                  {/* Save to queue */}
                  {generatedCopy && (
                    <button onClick={saveToQueue} disabled={savingPost}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50">
                      {savingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      {savingPost ? "Saving…" : "Save to Queue"}
                    </button>
                  )}
                </div>
              </div>

              {/* Right: card preview + share */}
              <div className="lg:col-span-3 space-y-5">
                <div className="sticky top-24 space-y-5">

                  {/* Card Preview */}
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="font-semibold text-foreground">Card Preview</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{templateLabel} · updates live</p>
                      </div>
                      <button onClick={printTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </div>
                    <div ref={printRef} className="max-w-md mx-auto">
                      {previewBrand && renderTemplate(selectedTemplate, previewBrand)}
                    </div>
                  </div>

                  {/* Share to platforms */}
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-1"><Share2 className="w-4 h-4 text-primary" /><h2 className="font-semibold text-foreground">Share to Platforms</h2></div>
                    <p className="text-xs text-muted-foreground mb-5">Generate a caption above, then share to your platform of choice.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {PLATFORMS.map(platform => (
                        <button key={platform.id} onClick={() => handlePlatformShare(platform)} disabled={shareLoading === platform.id}
                          className="group flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform" style={{ background: platform.color }}>
                            {shareLoading === platform.id ? <Loader2 className="w-4 h-4 animate-spin" /> : platform.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{platform.name}</p>
                            <p className="text-xs text-muted-foreground">{platform.shareUrl("", "") ? "Open & post" : "Copy + open"}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB: QUEUE ──────────────────────────────────────────────────── */}
        {activeTab === "queue" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-semibold text-foreground">Post Queue</h2>
                <p className="text-sm text-muted-foreground">Saved captions ready to publish. Go to Create, generate a caption, and click "Save to Queue."</p>
              </div>
            </div>

            {postsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary/50" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">No posts saved yet</p>
                <p className="text-sm text-muted-foreground mt-1">Generate a caption in Create tab, then click "Save to Queue"</p>
                <button onClick={() => setActiveTab("create")} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
                  Go to Create →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => {
                  const tmpl = TEMPLATES.find(t => t.id === post.templateType);
                  return (
                    <div key={post.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0 mt-0.5">{tmpl?.emoji ?? "📝"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-foreground">{tmpl?.label ?? post.templateType}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.status === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                              {post.status === "scheduled" ? "Scheduled" : "Draft"}
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed line-clamp-3">{post.caption}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(post.createdAt), "MMM d · h:mm a")}</span>
                            {post.platform && <span>· {post.platform}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={async () => { await navigator.clipboard.writeText(post.caption); toast({ title: "Caption copied!" }); }}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => deletePost(post.id)} disabled={deletingPost === post.id}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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
              <div className="flex items-center gap-3 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
                <Crown className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Upgrade to Pro to schedule posts</p>
                  <p className="text-xs text-amber-700">Pro vendors can set specific times to be reminded to publish their posts.</p>
                </div>
                <a href="/vendor/subscription" className="text-xs font-bold text-amber-700 underline flex-shrink-0">Upgrade</a>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: BRAND KIT ──────────────────────────────────────────────── */}
        {activeTab === "brand" && (
          <div className="max-w-2xl space-y-6">

            {/* Logo & Cover preview */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Image className="w-4 h-4 text-primary" /><h2 className="font-semibold">Brand Assets</h2></div>
                <a href="/vendor/branding" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Manage uploads <ChevronRight className="w-4 h-4" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-xl overflow-hidden bg-muted aspect-square flex items-center justify-center">
                  {brand.logoUrl
                    ? <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <div className="text-center"><div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2"><span className="text-2xl font-black text-primary">{brand.name.charAt(0)}</span></div><p className="text-xs text-muted-foreground">No logo yet</p></div>}
                </div>
                <div className="border rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                  {brand.coverImageUrl
                    ? <img src={brand.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    : <div className="text-center p-4"><Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" /><p className="text-xs text-muted-foreground">No cover yet</p></div>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Upload your logo and cover on the <a href="/vendor/branding" className="text-primary hover:underline">Branding & Media</a> page</p>
            </div>

            {/* Colors */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4"><Palette className="w-4 h-4 text-primary" /><h2 className="font-semibold">Colors</h2></div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={localColors.primary} onChange={e => setLocalColors(c => ({ ...c, primary: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border border-border" />
                    <input type="text" value={localColors.primary} onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLocalColors(c => ({ ...c, primary: v })); }} className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono" placeholder="#FF6B35" />
                    <div className="w-10 h-10 rounded-lg shadow-sm border border-border" style={{ background: localColors.primary }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={localColors.secondary} onChange={e => setLocalColors(c => ({ ...c, secondary: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border border-border" />
                    <input type="text" value={localColors.secondary} onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLocalColors(c => ({ ...c, secondary: v })); }} className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono" placeholder="#2C3E50" />
                    <div className="w-10 h-10 rounded-lg shadow-sm border border-border" style={{ background: localColors.secondary }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4"><Star className="w-4 h-4 text-primary" /><h2 className="font-semibold">Tagline</h2></div>
              <input type="text" value={localTagline} onChange={e => setLocalTagline(e.target.value)}
                placeholder={`e.g., "The best ${brand.cuisine.toLowerCase()} in town"`}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" maxLength={80} />
              <p className="text-xs text-muted-foreground mt-1">{localTagline.length}/80 · Used in card templates and AI captions</p>
            </div>

            {/* Font Style */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Type className="w-4 h-4 text-primary" /><h2 className="font-semibold">Font Style</h2></div>
                {!isPro && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Crown className="w-3 h-3" /> Pro</span>}
              </div>
              {!isPro && (
                <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  Font styles are available on the Pro plan. <a href="/vendor/subscription" className="font-bold underline">Upgrade →</a>
                </div>
              )}
              <div className="grid grid-cols-5 gap-2">
                {FONTS.map(font => (
                  <button key={font.id} onClick={() => isPro && setLocalFontStyle(font.id)} disabled={!isPro}
                    className={`p-3 rounded-xl border text-center transition-all ${localFontStyle === font.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"} ${!isPro ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <div className="text-base font-bold mb-1" style={{ fontFamily: font.family, fontWeight: font.weight }}>Aa</div>
                    <div className="text-xs text-muted-foreground">{font.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4"><Layers className="w-4 h-4 text-primary" /><h2 className="font-semibold">Live Preview</h2></div>
              <div className="max-w-sm mx-auto">
                {previewBrand && renderTemplate("social", previewBrand)}
              </div>
            </div>

            {/* Save */}
            <button onClick={saveBrand} disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Brand Kit"}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
