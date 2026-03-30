import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Palette, Sparkles, Copy, Check, Printer, Instagram, Twitter,
  MapPin, Star, Calendar, Zap, Loader2, Download, RefreshCw, Save, Lock,
} from "lucide-react";


interface BrandData {
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
  name: string;
  cuisine: string;
  description: string | null;
  instagramHandle: string | null;
  twitterHandle: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
}

type TemplateType = "social" | "open-now" | "special" | "event";

const TEMPLATES: { id: TemplateType; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "social", label: "Social Post", icon: <Instagram className="w-4 h-4" />, description: "Instagram & Facebook ready" },
  { id: "open-now", label: "Open Now", icon: <Zap className="w-4 h-4" />, description: "Announce you're serving" },
  { id: "special", label: "Daily Special", icon: <Star className="w-4 h-4" />, description: "Highlight today's special" },
  { id: "event", label: "Event Night", icon: <Calendar className="w-4 h-4" />, description: "Event attendance card" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 107, b: 53 };
}

function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function SocialTemplate({ brand }: { brand: BrandData }) {
  const textOnPrimary = isLightColor(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  const textOnSecondary = isLightColor(brand.secondaryColor) ? "#1a1a1a" : "#ffffff";
  const { r: r1, g: g1, b: b1 } = hexToRgb(brand.primaryColor);
  const { r: r2, g: g2, b: b2 } = hexToRgb(brand.secondaryColor);
  return (
    <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)` }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center shadow-lg" style={{ background: `rgba(${r2},${g2},${b2},0.3)`, border: `3px solid rgba(255,255,255,0.4)` }}>
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-3xl font-black" style={{ color: textOnPrimary }}>{brand.name.charAt(0)}</span>
          )}
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-1" style={{ color: textOnPrimary }}>{brand.name}</h2>
        <p className="text-sm font-semibold uppercase tracking-widest mb-4 opacity-80" style={{ color: textOnPrimary }}>{brand.cuisine}</p>
        {brand.tagline && (
          <p className="text-lg font-medium italic max-w-xs" style={{ color: textOnPrimary, opacity: 0.9 }}>"{brand.tagline}"</p>
        )}
      </div>
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: `rgba(0,0,0,0.25)` }}>
        <div className="flex items-center gap-1">
          {brand.instagramHandle && (
            <span className="text-sm font-semibold" style={{ color: textOnPrimary, opacity: 0.9 }}>@{brand.instagramHandle}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 opacity-70" style={{ color: textOnPrimary }} />
          <span className="text-xs font-medium opacity-70" style={{ color: textOnPrimary }}>Find us on RoamBites</span>
        </div>
      </div>
    </div>
  );
}

function OpenNowTemplate({ brand }: { brand: BrandData }) {
  const textOnPrimary = isLightColor(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ background: brand.secondaryColor }}>
      <div className="px-8 py-6" style={{ background: brand.primaryColor }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: textOnPrimary, opacity: 0.85 }}>Open Now</span>
        </div>
        <h2 className="text-4xl font-black tracking-tight" style={{ color: textOnPrimary }}>{brand.name}</h2>
        <p className="text-sm font-semibold uppercase tracking-wider mt-1" style={{ color: textOnPrimary, opacity: 0.75 }}>{brand.cuisine}</p>
      </div>
      <div className="px-8 py-6">
        <p className="text-lg font-medium leading-relaxed mb-6" style={{ color: isLightColor(brand.secondaryColor) ? "#374151" : "#e5e7eb" }}>
          {brand.tagline || brand.description || `Fresh ${brand.cuisine} served with love. Come find us today!`}
        </p>
        <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: `rgba(128,128,128,0.3)` }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg" style={{ background: brand.primaryColor, color: textOnPrimary }}>
            {brand.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: isLightColor(brand.secondaryColor) ? "#111" : "#fff" }}>{brand.name}</p>
            {brand.instagramHandle && (
              <p className="text-xs opacity-60" style={{ color: isLightColor(brand.secondaryColor) ? "#555" : "#aaa" }}>@{brand.instagramHandle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecialTemplate({ brand }: { brand: BrandData }) {
  const textOnPrimary = isLightColor(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  const { r, g, b } = hexToRgb(brand.primaryColor);
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ border: `3px solid ${brand.primaryColor}` }}>
      <div className="px-8 py-5 flex items-center justify-between" style={{ background: brand.primaryColor }}>
        <div>
          <p className="text-xs font-black uppercase tracking-widest opacity-80" style={{ color: textOnPrimary }}>Today's Special</p>
          <h2 className="text-2xl font-black" style={{ color: textOnPrimary }}>{brand.name}</h2>
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2" style={{ background: `rgba(255,255,255,0.2)`, borderColor: `rgba(255,255,255,0.4)`, color: textOnPrimary }}>
          {brand.name.charAt(0)}
        </div>
      </div>
      <div className="px-8 py-7 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 fill-current" style={{ color: brand.primaryColor }} />
          <span className="font-bold text-lg" style={{ color: brand.primaryColor }}>Featured Item</span>
        </div>
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
  const textOnPrimary = isLightColor(brand.primaryColor) ? "#1a1a1a" : "#ffffff";
  const textOnSecondary = isLightColor(brand.secondaryColor) ? "#1a1a1a" : "#ffffff";
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: brand.secondaryColor }}>
      <div className="relative px-8 pt-8 pb-6" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textOnPrimary }}>Live Event</span>
        </div>
        <Calendar className="w-8 h-8 mb-3" style={{ color: textOnPrimary, opacity: 0.8 }} />
        <h2 className="text-3xl font-black tracking-tight" style={{ color: textOnPrimary }}>{brand.name}</h2>
        <p className="text-sm font-semibold opacity-80 mt-1" style={{ color: textOnPrimary }}>Will be there!</p>
      </div>
      <div className="px-8 py-6">
        <p className="text-base font-medium leading-relaxed mb-4" style={{ color: isLightColor(brand.secondaryColor) ? "#374151" : "#e5e7eb" }}>
          Come taste our {brand.cuisine.toLowerCase()} at the event! {brand.tagline || "We can't wait to see you there."}
        </p>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: brand.primaryColor }}>
          <MapPin className="w-4 h-4" />
          <span>Track us live on RoamBites</span>
        </div>
        {(brand.instagramHandle || brand.twitterHandle) && (
          <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: isLightColor(brand.secondaryColor) ? "#6b7280" : "#9ca3af" }}>
            {brand.instagramHandle && <span>📸 @{brand.instagramHandle}</span>}
            {brand.twitterHandle && <span>🐦 @{brand.twitterHandle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function renderTemplate(type: TemplateType, brand: BrandData) {
  switch (type) {
    case "social": return <SocialTemplate brand={brand} />;
    case "open-now": return <OpenNowTemplate brand={brand} />;
    case "special": return <SpecialTemplate brand={brand} />;
    case "event": return <EventTemplate brand={brand} />;
  }
}

export default function VendorMarketing() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("social");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localColors, setLocalColors] = useState({ primary: "#FF6B35", secondary: "#2C3E50" });
  const [localTagline, setLocalTagline] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (user && user.role !== "vendor" && user.role !== "admin" && user.role !== "superadmin") { navigate("/"); return; }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(getApiUrl(`/api/vendor/marketing/brand`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: BrandData) => {
        setBrand(data);
        setLocalColors({ primary: data.primaryColor, secondary: data.secondaryColor });
        setLocalTagline(data.tagline ?? "");
      })
      .catch(() => toast({ title: "Could not load brand data", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const previewBrand: BrandData | null = brand
    ? { ...brand, primaryColor: localColors.primary, secondaryColor: localColors.secondary, tagline: localTagline }
    : null;

  async function saveBrand() {
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/brand`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ primaryColor: localColors.primary, secondaryColor: localColors.secondary, tagline: localTagline }),
      });
      if (!res.ok) throw new Error("Save failed");
      setBrand((b) => b ? { ...b, primaryColor: localColors.primary, secondaryColor: localColors.secondary, tagline: localTagline } : b);
      toast({ title: "Brand kit saved!", description: "Your colors and tagline have been updated." });
    } catch {
      toast({ title: "Failed to save brand kit", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function generateCopy() {
    setGeneratingCopy(true);
    setGeneratedCopy("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/vendor/marketing/copy`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateType: selectedTemplate }),
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

  async function copyCopy() {
    await navigator.clipboard.writeText(generatedCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  }

  function printTemplate() {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${brand?.name ?? ""} – Marketing</title>
      <style>
        body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; font-family: system-ui, sans-serif; }
        .card { max-width: 480px; width: 100%; }
        @media print { body { background: white; } }
      </style>
      </head><body>
      <div class="card">${node.innerHTML}</div>
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!brand) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">No truck profile found. Please set up your truck first.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Marketing Studio</h1>
              <p className="text-sm text-muted-foreground">Create on-brand materials for {brand.name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left panel: Brand Kit + Template Picker + AI Copy */}
          <div className="lg:col-span-2 space-y-6">

            {/* Brand Kit */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Brand Kit</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={localColors.primary}
                        onChange={(e) => setLocalColors((c) => ({ ...c, primary: e.target.value }))}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={localColors.primary}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLocalColors((c) => ({ ...c, primary: v }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                        placeholder="#FF6B35"
                      />
                    </div>
                    <div className="w-10 h-10 rounded-lg shadow-sm border border-border" style={{ background: localColors.primary }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={localColors.secondary}
                      onChange={(e) => setLocalColors((c) => ({ ...c, secondary: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={localColors.secondary}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLocalColors((c) => ({ ...c, secondary: v }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                        placeholder="#2C3E50"
                      />
                    </div>
                    <div className="w-10 h-10 rounded-lg shadow-sm border border-border" style={{ background: localColors.secondary }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tagline</label>
                  <input
                    type="text"
                    value={localTagline}
                    onChange={(e) => setLocalTagline(e.target.value)}
                    placeholder={`e.g., "The best ${brand.cuisine.toLowerCase()} in town"`}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    maxLength={80}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{localTagline.length}/80</p>
                </div>
                <button
                  onClick={saveBrand}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Brand Kit"}
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground mb-3">Template Type</h2>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTemplate(t.id); setGeneratedCopy(""); }}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      selectedTemplate === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`mb-1.5 ${selectedTemplate === t.id ? "text-primary" : "text-muted-foreground"}`}>
                      {t.icon}
                    </div>
                    <p className={`text-xs font-semibold ${selectedTemplate === t.id ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Copy Generator */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground">AI Copy Generator</h2>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Generate caption and hashtags for your selected template, matched to your brand voice.
              </p>
              <button
                onClick={generateCopy}
                disabled={generatingCopy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors disabled:opacity-50 mb-3"
              >
                {generatingCopy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {generatingCopy ? "Generating..." : `Generate ${TEMPLATES.find((t) => t.id === selectedTemplate)?.label} Copy`}
              </button>
              {generatedCopy && (
                <div className="relative">
                  <textarea
                    value={generatedCopy}
                    onChange={(e) => setGeneratedCopy(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-muted/30 resize-none min-h-[140px] text-foreground leading-relaxed"
                    placeholder="Your AI-generated copy will appear here…"
                  />
                  <button
                    onClick={copyCopy}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Template Preview */}
          <div className="lg:col-span-3">
            <div className="sticky top-24">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-semibold text-foreground">Preview</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TEMPLATES.find((t) => t.id === selectedTemplate)?.label} — updates live as you edit
                    </p>
                  </div>
                  <button
                    onClick={printTemplate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Save / Print
                  </button>
                </div>

                <div ref={printRef} className="max-w-md mx-auto">
                  {previewBrand && renderTemplate(selectedTemplate, previewBrand)}
                </div>

                {/* Usage tips */}
                <div className="mt-6 rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">How to use</p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">1.</span> Pick your brand colors and tagline in the Brand Kit panel</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">2.</span> Choose a template type that fits your post</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">3.</span> Generate AI copy for the perfect caption + hashtags</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">4.</span> Click "Save / Print" to download your card as a PDF</li>
                    <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">5.</span> Pair the card with the caption for a complete social post</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
