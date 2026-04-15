import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/Layout";
import {
  Building2, Home, Repeat, Zap, MapPin, Calendar, DollarSign,
  ChevronLeft, ChevronRight, CheckCircle, Plus, Trash2, Clock, Users,
  Lock, ExternalLink, Info,
} from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const SPOT_TYPES = [
  { value: "truck_park", label: "Truck Park", icon: <Building2 className="w-6 h-6" />, desc: "Multiple spaces for food trucks to operate long-term or regularly." },
  { value: "single_spot", label: "Single Spot", icon: <Home className="w-6 h-6" />, desc: "One parking space, lot, or area available at a business or property." },
  { value: "recurring_host", label: "Recurring Host", icon: <Repeat className="w-6 h-6" />, desc: "Brewery, office park, or business that hosts trucks on a schedule." },
  { value: "popup_opportunity", label: "Pop-Up", icon: <Zap className="w-6 h-6" />, desc: "A one-time opportunity for a single food truck to operate at your location." },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Schedule {
  date?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}

interface FormData {
  spotType: string;
  title: string;
  description: string;
  hostName: string;
  address: string;
  city: string;
  spotsTotal: number;
  priceInCents: number;
  isInstantBook: boolean;
  hasWaitlist: boolean;
  scheduleType: string;
  schedules: Schedule[];
  requirements: string;
  requiresAcknowledgement: boolean;
  amenities: string[];
}

const STEPS = ["Type", "Info", "Availability", "Spots & Pricing", "Review"];

const COMMON_AMENITIES = ["WiFi", "Power hookup", "Water access", "Restrooms", "High traffic", "Parking", "Security", "Covered area"];

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"}`}>
            {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
          {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function ListASpot() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    spotType: "",
    title: "",
    description: "",
    hostName: "",
    address: "",
    city: "Oklahoma City",
    spotsTotal: 1,
    priceInCents: 0,
    isInstantBook: false,
    hasWaitlist: false,
    scheduleType: "one_time",
    schedules: [{}],
    requirements: "",
    requiresAcknowledgement: false,
    amenities: [],
  });

  const isPopUp = form.spotType === "popup_opportunity";

  function set(key: keyof FormData, value: any) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function selectSpotType(type: string) {
    if (type === "popup_opportunity") {
      setForm(f => ({ ...f, spotType: type, spotsTotal: 1, scheduleType: "one_time", hasWaitlist: false }));
    } else {
      set("spotType", type);
    }
  }

  function addSchedule() {
    set("schedules", [...form.schedules, {}]);
  }

  function removeSchedule(i: number) {
    set("schedules", form.schedules.filter((_, idx) => idx !== i));
  }

  function updateSchedule(i: number, key: keyof Schedule, value: any) {
    const updated = form.schedules.map((s, idx) => idx === i ? { ...s, [key]: value } : s);
    set("schedules", updated);
  }

  function toggleAmenity(a: string) {
    set("amenities", form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a]);
  }

  function toggleDay(d: number) {
    const hasDaySchedule = form.schedules.some(s => s.dayOfWeek === d);
    if (hasDaySchedule) {
      set("schedules", form.schedules.filter(s => s.dayOfWeek !== d));
    } else {
      const existing = form.schedules.find(s => s.dayOfWeek !== undefined);
      set("schedules", [...form.schedules, { dayOfWeek: d, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "20:00" }]);
    }
  }

  function canAdvance(): boolean {
    if (step === 0) return !!form.spotType;
    if (step === 1) return !!(form.title && form.city);
    if (step === 2) return form.schedules.length > 0;
    if (step === 3) return form.spotsTotal >= 1;
    return true;
  }

  async function handleSubmit() {
    if (!isAuthenticated) { navigate("/login"); return; }
    setSubmitting(true);
    try {
      const priceInCents = typeof form.priceInCents === "string"
        ? Math.round(parseFloat(form.priceInCents as any) * 100) || 0
        : form.priceInCents;

      const payload = { ...form, priceInCents };
      const res = await fetch(getApiUrl(`/api/spots`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({ title: "Spot listed!", description: "Your spot is now live on the marketplace." });
      navigate(`/spots/${data.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to create listing. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/spots">
          <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Spot Marketplace
          </button>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-foreground">List a Spot</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect food trucks with your space in a few easy steps.</p>
        </div>

        <StepIndicator step={step} total={STEPS.length} />

        {/* Step 0: Type */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground mb-1">What kind of spot are you listing?</h2>
            <p className="text-sm text-muted-foreground mb-4">Pick the option that best describes your space.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SPOT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => selectSpotType(t.value)}
                  className={`flex flex-col gap-3 p-5 rounded-2xl border-2 text-left transition-all hover:border-primary/60 ${form.spotType === t.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${form.spotType === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {t.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Pop-Up callout shown when selected */}
            {isPopUp && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 mt-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Pop-Up is for single truck opportunities</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    One-time, one truck only. For multiple trucks or a structured event with vendor applications,
                    use the event creation flow instead.
                  </p>
                  <Link href="/organizer/events/new">
                    <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 transition-colors">
                      Create an Event instead <ExternalLink className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-foreground mb-1">Basic info</h2>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Listing title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="e.g. Midtown Parking Lot — Fri & Sat"
                className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Tell food trucks about this spot — what makes it great, the foot traffic, nearby businesses, etc."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Your name / business *</label>
                <input
                  type="text"
                  value={form.hostName}
                  onChange={e => set("hostName", e.target.value)}
                  placeholder="e.g. Bricktown Properties"
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">City *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                  placeholder="e.g. Oklahoma City"
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="e.g. 123 Main St"
                className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_AMENITIES.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.amenities.includes(a) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Availability */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground mb-1">When is this spot available?</h2>

            {/* Pop-Up: one-time only — lock the toggle */}
            {isPopUp ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-2xl border border-border">
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">One-time date</span>
                <span className="ml-auto text-xs text-muted-foreground">Pop-Ups are always one-time only</span>
              </div>
            ) : (
              <div className="flex gap-3">
                {["one_time", "recurring"].map(type => (
                  <button
                    key={type}
                    onClick={() => { set("scheduleType", type); set("schedules", [{}]); }}
                    className={`flex-1 py-3 rounded-2xl text-sm font-semibold border-2 transition-all ${form.scheduleType === type ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {type === "one_time" ? "One-time / specific dates" : "Recurring schedule"}
                  </button>
                ))}
              </div>
            )}

            {form.scheduleType === "one_time" ? (
              <div className="space-y-3">
                {form.schedules.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="date"
                      value={s.date ?? ""}
                      onChange={e => updateSchedule(i, "date", e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="time"
                      value={s.startTime ?? ""}
                      onChange={e => updateSchedule(i, "startTime", e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <input
                      type="time"
                      value={s.endTime ?? ""}
                      onChange={e => updateSchedule(i, "endTime", e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {form.schedules.length > 1 && (
                      <button onClick={() => removeSchedule(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addSchedule} className="w-full py-3 border border-dashed border-border rounded-2xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add another date
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-3">Which days?</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAY_NAMES.map((d, i) => {
                      const selected = form.schedules.some(s => s.dayOfWeek === i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleDay(i)}
                          className={`w-11 h-11 rounded-full text-sm font-semibold border-2 transition-all ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {form.schedules.filter(s => s.dayOfWeek !== undefined).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Hours (applied to all selected days)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="time"
                        value={form.schedules.find(s => s.dayOfWeek !== undefined)?.startTime ?? "09:00"}
                        onChange={e => set("schedules", form.schedules.map(s => s.dayOfWeek !== undefined ? { ...s, startTime: e.target.value } : s))}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <input
                        type="time"
                        value={form.schedules.find(s => s.dayOfWeek !== undefined)?.endTime ?? "20:00"}
                        onChange={e => set("schedules", form.schedules.map(s => s.dayOfWeek !== undefined ? { ...s, endTime: e.target.value } : s))}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Spots & Pricing */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground mb-1">Spots & pricing</h2>

            {/* Pop-Up single-truck enforcement banner */}
            {isPopUp && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Limited to 1 spot</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Pop-Ups are for single truck opportunities only. The spot count is fixed at 1 and cannot be changed.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Need multiple trucks?{" "}
                    <Link href="/organizer/events/new">
                      <span className="font-semibold underline underline-offset-2 cursor-pointer hover:text-amber-900 inline-flex items-center gap-1">
                        Create an Event instead <ExternalLink className="w-3 h-3" />
                      </span>
                    </Link>
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                  Number of spots
                  {isPopUp && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                </label>
                {isPopUp ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/50 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">1 spot</span>
                    <span className="text-xs">(fixed for Pop-Up)</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={form.spotsTotal}
                    onChange={e => set("spotsTotal", parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Price per spot</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.priceInCents === 0 ? "" : (form.priceInCents / 100)}
                    onChange={e => set("priceInCents", e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                    placeholder="0 for free"
                    className="w-full pl-8 pr-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {form.priceInCents === 0 && <p className="text-xs text-emerald-600 mt-1 font-medium">Free — no charge to vendors</p>}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${form.isInstantBook ? "border-primary bg-primary" : "border-border group-hover:border-primary/40"}`}
                  onClick={() => set("isInstantBook", !form.isInstantBook)}>
                  {form.isInstantBook && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" /> Instant book
                  </p>
                  <p className="text-xs text-muted-foreground">Vendors can reserve immediately without waiting for your approval.</p>
                </div>
              </label>
              {/* Waitlist is not applicable for single-spot Pop-Ups */}
              {!isPopUp && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${form.hasWaitlist ? "border-primary bg-primary" : "border-border group-hover:border-primary/40"}`}
                    onClick={() => set("hasWaitlist", !form.hasWaitlist)}>
                    {form.hasWaitlist && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Enable waitlist
                    </p>
                    <p className="text-xs text-muted-foreground">Let vendors join a waitlist when spots are full.</p>
                  </div>
                </label>
              )}
            </div>

            <div className="border-t border-border pt-5">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Requirements for vendors</label>
                <textarea
                  value={form.requirements}
                  onChange={e => set("requirements", e.target.value)}
                  placeholder="e.g. Must have valid health permit. No generators allowed. Must be self-contained."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              {form.requirements && (
                <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.requiresAcknowledgement}
                    onChange={e => set("requiresAcknowledgement", e.target.checked)}
                    className="rounded"
                  />
                  Require vendors to acknowledge these requirements when applying
                </label>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-foreground mb-1">Review your listing</h2>
            <p className="text-sm text-muted-foreground">Everything looks good? Your spot will be published immediately.</p>

            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">
                    {SPOT_TYPES.find(t => t.value === form.spotType)?.label ?? form.spotType}
                  </p>
                  <h3 className="font-bold text-foreground text-lg">{form.title}</h3>
                  {form.hostName && <p className="text-sm text-muted-foreground">by {form.hostName}</p>}
                </div>
                <p className="font-bold text-primary text-xl">{form.priceInCents === 0 ? "Free" : `$${(form.priceInCents / 100).toFixed(0)}/spot`}</p>
              </div>
              {form.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {form.address}, {form.city}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> {form.spotsTotal} spot{form.spotsTotal !== 1 ? "s" : ""}
                </span>
                {form.isInstantBook && <span className="flex items-center gap-1 text-primary font-medium"><Zap className="w-3.5 h-3.5" /> Instant book</span>}
                {form.hasWaitlist && <span className="flex items-center gap-1 text-amber-600"><Clock className="w-3.5 h-3.5" /> Waitlist on</span>}
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {form.scheduleType === "recurring"
                    ? `Recurring · ${form.schedules.filter(s => s.dayOfWeek != null).map(s => DAY_NAMES[s.dayOfWeek!]).join(", ")}`
                    : `${form.schedules.filter(s => s.date).length} date${form.schedules.filter(s => s.date).length !== 1 ? "s" : ""}`
                  }
                </span>
              </div>
              {form.requirements && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">{form.requirements}</p>
              )}
            </div>

            {!isAuthenticated && (
              <div className="bg-muted rounded-2xl p-4 text-sm text-muted-foreground flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                You need to be logged in to publish. Your data will be saved.
              </div>
            )}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <button
            onClick={() => step === 0 ? navigate("/spots") : setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !isAuthenticated}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {submitting ? "Publishing…" : "Publish listing"}
              {!submitting && <CheckCircle className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
