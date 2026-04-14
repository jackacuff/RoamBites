import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, authHeaders } from "@/lib/api";
import {
  Calendar, MapPin, Clock, Truck, ClipboardList, Eye,
  ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle, X,
  ImageIcon, DollarSign, Users, Zap, ChevronRight, Info,
  Copy, AlertTriangle, ExternalLink, ShieldCheck,
} from "lucide-react";

// ── Shared styles ─────────────────────────────────────────────────────────
const inp = "w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
const lbl = "block text-sm font-medium text-foreground mb-1.5";

function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────
interface EventDay {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
}

interface SpotConfig {
  name: string;
  totalSlots: number;
  priceInDollars: string;
  isInstantBook: boolean;
  requirements: string;
  vendorRules: string;
}

interface Step1Data {
  name: string;
  description: string;
  venueName: string;
  city: string;
  address: string;
  websiteUrl: string;
  eventType: string;
  expectedAttendance: string;
  bannerImageUrl: string | null;
  photoUrls: string[];
}

interface Step4Data {
  availableHookups: string;
  vendorFeeStructure: string;
  spotFeeAmount: string;
  vendorPaymentMethod: string;
  vendorNotes: string;
  publicNotes: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  additionalInfo: string;
}

// ── Progress indicator ────────────────────────────────────────────────────
const STEPS = [
  { label: "Event Info",    icon: <Calendar className="w-4 h-4" /> },
  { label: "Schedule",     icon: <Clock className="w-4 h-4" /> },
  { label: "Spots",        icon: <Truck className="w-4 h-4" /> },
  { label: "Requirements", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Review",       icon: <Eye className="w-4 h-4" /> },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* connecting line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />
        <div
          className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((s, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <div key={i} className="relative flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${
                done ? "bg-primary border-primary text-primary-foreground" :
                active ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30" :
                "bg-background border-border text-muted-foreground"
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{num}</span>}
              </div>
              <span className={`mt-2 text-[11px] font-medium hidden sm:block whitespace-nowrap ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
        <h2 className="font-semibold text-foreground text-lg">{title}</h2>
      </div>
      <div className="px-6 py-6 space-y-5">{children}</div>
    </div>
  );
}

function NavButtons({ step, totalSteps, onBack, onNext, nextLabel, nextDisabled, loading }: {
  step: number; totalSteps: number; onBack: () => void; onNext: () => void;
  nextLabel?: string; nextDisabled?: boolean; loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        type="button"
        onClick={onBack}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors ${step === 1 ? "opacity-0 pointer-events-none" : ""}`}
      >
        <ArrowLeft className="w-4 h-4" />Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
      >
        {loading ? "Saving…" : (nextLabel ?? "Continue")}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Step 1: Event Info ────────────────────────────────────────────────────
function Step1({ data, onChange, onNext, uploadingBanner, onBannerUpload, uploadingPhoto, onPhotoUpload }: {
  data: Step1Data;
  onChange: (d: Partial<Step1Data>) => void;
  onNext: () => void;
  uploadingBanner: boolean;
  onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingPhoto: boolean;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.name.trim()) e.name = "Event name is required";
    if (!data.venueName.trim()) e.venueName = "Venue name is required";
    if (!data.city.trim()) e.city = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <StepCard title="Event Info" icon={<Calendar className="w-5 h-5" />}>
      <Field label="Event Name *" error={errors.name}>
        <input value={data.name} onChange={e => onChange({ name: e.target.value })} className={inp} placeholder="Midtown Food Truck Rally" />
      </Field>

      <Field label="Description">
        <textarea value={data.description} onChange={e => onChange({ description: e.target.value })} rows={3} className={inp + " resize-none"} placeholder="Tell vendors and guests what to expect…" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Venue / Location Name *" error={errors.venueName}>
          <input value={data.venueName} onChange={e => onChange({ venueName: e.target.value })} className={inp} placeholder="Scissortail Park" />
        </Field>
        <Field label="City *" error={errors.city}>
          <input value={data.city} onChange={e => onChange({ city: e.target.value })} className={inp} placeholder="Oklahoma City" />
        </Field>
      </div>

      <Field label="Street Address">
        <input value={data.address} onChange={e => onChange({ address: e.target.value })} className={inp} placeholder="300 SW 7th St" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Website / Info URL">
          <input type="url" value={data.websiteUrl} onChange={e => onChange({ websiteUrl: e.target.value })} className={inp} placeholder="https://…" />
        </Field>
        <Field label="Event Type">
          <select value={data.eventType} onChange={e => onChange({ eventType: e.target.value })} className={inp}>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="both">Public + Private area</option>
          </select>
        </Field>
      </div>

      <Field label="Expected Attendance">
        <input type="number" min={0} value={data.expectedAttendance} onChange={e => onChange({ expectedAttendance: e.target.value })} className={inp} placeholder="500" />
      </Field>

      {/* Banner */}
      <Field label="Banner Image">
        {data.bannerImageUrl ? (
          <div className="relative rounded-2xl overflow-hidden h-40">
            <img src={data.bannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange({ bannerImageUrl: null })} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/50 transition-colors">
            <ImageIcon className="w-6 h-6 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">{uploadingBanner ? "Uploading…" : "Click to upload banner"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={onBannerUpload} disabled={uploadingBanner} />
          </label>
        )}
      </Field>

      {/* Photos */}
      <Field label="Event Photos" hint="First photo becomes the thumbnail on event cards.">
        {data.photoUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.photoUrls.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[9px] text-center py-0.5 text-primary-foreground font-medium">Thumbnail</span>}
                <button type="button" onClick={() => onChange({ photoUrls: data.photoUrls.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground ${uploadingPhoto ? "opacity-50 pointer-events-none" : ""}`}>
          <Plus className="w-4 h-4" />{uploadingPhoto ? "Uploading…" : "Add photos"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onPhotoUpload} disabled={uploadingPhoto} />
        </label>
      </Field>

      <NavButtons step={1} totalSteps={5} onBack={() => {}} onNext={handleNext} />
    </StepCard>
  );
}

// ── Step 2: Schedule ──────────────────────────────────────────────────────
function Step2({ days, onChange, onBack, onNext }: {
  days: EventDay[];
  onChange: (days: EventDay[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const addDay = () => {
    const lastDay = days[days.length - 1];
    const nextDate = lastDay?.date
      ? new Date(new Date(lastDay.date + "T12:00:00").getTime() + 86400000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    onChange([...days, {
      id: Math.random().toString(36).slice(2),
      date: nextDate,
      startTime: lastDay?.startTime ?? "11:00",
      endTime: lastDay?.endTime ?? "21:00",
      label: `Day ${days.length + 1}`,
    }]);
  };

  const copyPrevious = (idx: number) => {
    if (idx === 0) return;
    const prev = days[idx - 1];
    const updated = days.map((d, i) => i === idx ? { ...d, startTime: prev.startTime, endTime: prev.endTime } : d);
    onChange(updated);
    toast({ title: "Hours copied from previous day" });
  };

  const updateDay = (id: string, patch: Partial<EventDay>) => {
    onChange(days.map(d => d.id === id ? { ...d, ...patch } : d));
  };

  const removeDay = (id: string) => {
    onChange(days.filter(d => d.id !== id));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (days.length === 0) { e.days = "Add at least one day"; }
    days.forEach((d, i) => {
      if (!d.date) e[`date-${i}`] = "Date required";
      if (!d.startTime) e[`start-${i}`] = "Start time required";
      if (!d.endTime) e[`end-${i}`] = "End time required";
      if (d.startTime && d.endTime && d.startTime >= d.endTime) e[`time-${i}`] = "End must be after start";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <StepCard title="Event Schedule" icon={<Clock className="w-5 h-5" />}>
      <p className="text-sm text-muted-foreground -mt-1">Define each day of your event. Multi-day events can have different hours each day.</p>

      {errors.days && <p className="text-xs text-destructive">{errors.days}</p>}

      <div className="space-y-4">
        {days.map((day, idx) => (
          <div key={day.id} className="border border-border rounded-2xl p-5 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                <input
                  value={day.label}
                  onChange={e => updateDay(day.id, { label: e.target.value })}
                  className="text-sm font-semibold bg-transparent border-none outline-none text-foreground w-32 focus:ring-0"
                  placeholder={`Day ${idx + 1}`}
                />
              </div>
              <div className="flex items-center gap-1">
                {idx > 0 && (
                  <button type="button" onClick={() => copyPrevious(idx)} title="Copy previous day's hours" className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
                {days.length > 1 && (
                  <button type="button" onClick={() => removeDay(day.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Date" error={errors[`date-${idx}`]}>
                <input type="date" value={day.date} onChange={e => updateDay(day.id, { date: e.target.value })} className={inp} />
              </Field>
              <Field label="Start time" error={errors[`start-${idx}`] ?? errors[`time-${idx}`]}>
                <input type="time" value={day.startTime} onChange={e => updateDay(day.id, { startTime: e.target.value })} className={inp} />
              </Field>
              <Field label="End time" error={errors[`end-${idx}`]}>
                <input type="time" value={day.endTime} onChange={e => updateDay(day.id, { endTime: e.target.value })} className={inp} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDay}
        className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-primary/40 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />Add Another Day
      </button>

      <NavButtons step={2} totalSteps={5} onBack={onBack} onNext={handleNext} />
    </StepCard>
  );
}

// ── Step 3: Food Truck Spots ───────────────────────────────────────────────
function Step3({ spot, onChange, onBack, onNext, platformFeePercent, connectStatus }: {
  spot: SpotConfig;
  onChange: (s: Partial<SpotConfig>) => void;
  onBack: () => void;
  onNext: () => void;
  platformFeePercent: number;
  connectStatus: { onboardingComplete: boolean; connected: boolean } | null;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!spot.totalSlots || spot.totalSlots < 1) e.totalSlots = "At least 1 spot is required";
    if (spot.priceInDollars !== "" && isNaN(parseFloat(spot.priceInDollars))) e.price = "Enter a valid price";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  const priceVal = spot.priceInDollars === "" ? 0 : parseFloat(spot.priceInDollars) || 0;
  const isFree = priceVal === 0;
  const platformFeeAmt = priceVal > 0 ? priceVal * platformFeePercent / 100 : 0;
  const organizerReceives = priceVal - platformFeeAmt;
  const stripeNotReady = priceVal > 0 && connectStatus !== null && !connectStatus.onboardingComplete;

  return (
    <StepCard title="Food Truck Spots" icon={<Truck className="w-5 h-5" />}>
      <p className="text-sm text-muted-foreground -mt-1">Define how many vendor spots are available and how vendors can book them. This must be set before publishing.</p>

      <Field label="Spot / Package Name" hint="What do vendors see when they apply? E.g. 'Vendor Spot', 'Premium Corner Spot'">
        <input value={spot.name} onChange={e => onChange({ name: e.target.value })} className={inp} placeholder="Vendor Spot" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Number of Available Spots *" error={errors.totalSlots}>
          <input type="number" min={1} max={500} value={spot.totalSlots} onChange={e => onChange({ totalSlots: parseInt(e.target.value) || 1 })} className={inp} placeholder="10" />
        </Field>
        <Field label="Spot Price" error={errors.price} hint={isFree ? "Free — no charge to vendors" : undefined}>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="number" min={0} step="0.01" value={spot.priceInDollars} onChange={e => onChange({ priceInDollars: e.target.value })} className={inp + " pl-8"} placeholder="0.00" />
          </div>
        </Field>
      </div>

      {/* Payment breakdown */}
      {!isFree && priceVal > 0 && (
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">Payment breakdown (per spot)</p>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor pays</span>
              <span className="font-medium text-foreground">${priceVal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">RoamBites platform fee ({platformFeePercent}%)</span>
              <span className="text-muted-foreground">−${platformFeeAmt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-primary/15 pt-1.5">
              <span className="font-semibold text-foreground">You receive</span>
              <span className="font-bold text-primary">${organizerReceives.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Payments are processed by Stripe and deposited directly to your connected bank account.</p>
        </div>
      )}

      {/* Stripe Connect warning */}
      {stripeNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Stripe account required for paid spots</p>
            <p className="text-xs text-amber-700 mt-0.5">You've set a spot price but haven't connected your Stripe account yet. Vendors won't be able to pay until your account is set up.</p>
            <Link href="/organizer/connect">
              <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
                <ExternalLink className="w-3 h-3" />Connect Stripe account
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Booking type */}
      <Field label="How can vendors book a spot?">
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ isInstantBook: true })}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${spot.isInstantBook ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle className={`w-4 h-4 ${spot.isInstantBook ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-semibold text-sm text-foreground">Reserve Instantly</span>
            </div>
            <p className="text-xs text-muted-foreground">Vendors book immediately without organizer approval. Great for high-demand events.</p>
          </button>
          <button
            type="button"
            onClick={() => onChange({ isInstantBook: false })}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${!spot.isInstantBook ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ClipboardList className={`w-4 h-4 ${!spot.isInstantBook ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-semibold text-sm text-foreground">Application-Based</span>
            </div>
            <p className="text-xs text-muted-foreground">Vendors apply and you approve each one manually. Best for curated events.</p>
          </button>
        </div>
      </Field>

      <Field label="Spot Requirements / What vendors need to know" hint="Insurance, permits, setup requirements, size limits, etc.">
        <textarea value={spot.requirements} onChange={e => onChange({ requirements: e.target.value })} rows={3} className={inp + " resize-none"} placeholder="Vendors must carry $1M liability insurance. Space is 10×20 ft. No gas generators." />
      </Field>

      <Field label="Vendor Rules / Load-in instructions" hint="Load-in time, check-out, rules specific to confirmed vendors.">
        <textarea value={spot.vendorRules} onChange={e => onChange({ vendorRules: e.target.value })} rows={2} className={inp + " resize-none"} placeholder="Load-in from 8–10 AM. All trucks must be in position by 10:30 AM." />
      </Field>

      <NavButtons step={3} totalSteps={5} onBack={onBack} onNext={handleNext} />
    </StepCard>
  );
}

// ── Step 4: Requirements & Contact ────────────────────────────────────────
function Step4({ data, onChange, onBack, onNext }: {
  data: Step4Data;
  onChange: (d: Partial<Step4Data>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const showFeeAmount = data.vendorFeeStructure === "flat" || data.vendorFeeStructure === "percentage";

  return (
    <StepCard title="Requirements & Contact" icon={<ClipboardList className="w-5 h-5" />}>
      <p className="text-sm text-muted-foreground -mt-1">Add logistics details and contact information. These can be updated later.</p>

      {/* Hookups */}
      <Field label="Available Hookups">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: "water_electric", label: "Water + Electric" },
            { value: "water_only", label: "Water only" },
            { value: "electric_only", label: "Electric only" },
            { value: "none", label: "None" },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ availableHookups: opt.value })}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors text-center ${data.availableHookups === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary/40"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Fee structure */}
      <Field label="Vendor Fee Structure">
        <select value={data.vendorFeeStructure} onChange={e => onChange({ vendorFeeStructure: e.target.value })} className={inp}>
          <option value="none">No fee — free to participate</option>
          <option value="flat">Flat fee per truck</option>
          <option value="percentage">Percentage of sales</option>
        </select>
      </Field>

      {showFeeAmount && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={data.vendorFeeStructure === "flat" ? "Flat Fee Amount ($)" : "Percentage (%)"}>
            <input type="number" step="0.01" min={0} value={data.spotFeeAmount} onChange={e => onChange({ spotFeeAmount: e.target.value })} className={inp} placeholder={data.vendorFeeStructure === "flat" ? "50.00" : "10"} />
          </Field>
          <Field label="Who pays the fee?">
            <select value={data.vendorPaymentMethod} onChange={e => onChange({ vendorPaymentMethod: e.target.value })} className={inp}>
              <option value="organizer">Organizer pays vendors (reverse)</option>
              <option value="attendees">Vendors pay from their sales</option>
            </select>
          </Field>
        </div>
      )}

      {/* Notes */}
      <Field label="Vendor Notes" hint="Only shown to confirmed vendors — load-in, check-in time, etc.">
        <textarea value={data.vendorNotes} onChange={e => onChange({ vendorNotes: e.target.value })} rows={3} className={inp + " resize-none"} placeholder="Check-in at the south gate. Staff will guide you to your spot." />
      </Field>

      <Field label="Public Notes" hint="Visible to everyone — parking, transit, what to expect.">
        <textarea value={data.publicNotes} onChange={e => onChange({ publicNotes: e.target.value })} rows={2} className={inp + " resize-none"} placeholder="Free parking on 6th Ave. Shuttle from downtown every 20 min." />
      </Field>

      <Field label="Anything else?" hint="Any additional details or special requirements.">
        <textarea value={data.additionalInfo} onChange={e => onChange({ additionalInfo: e.target.value })} rows={2} className={inp + " resize-none"} />
      </Field>

      {/* Contact */}
      <div className="pt-2 border-t border-border">
        <p className="text-sm font-semibold text-foreground mb-4">Point of Contact</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First Name">
            <input value={data.contactFirstName} onChange={e => onChange({ contactFirstName: e.target.value })} className={inp} placeholder="Jane" />
          </Field>
          <Field label="Last Name">
            <input value={data.contactLastName} onChange={e => onChange({ contactLastName: e.target.value })} className={inp} placeholder="Smith" />
          </Field>
          <Field label="Email">
            <input type="email" value={data.contactEmail} onChange={e => onChange({ contactEmail: e.target.value })} className={inp} placeholder="you@example.com" />
          </Field>
          <Field label="Phone">
            <input type="tel" value={data.contactPhone} onChange={e => onChange({ contactPhone: e.target.value })} className={inp} placeholder="(405) 555-0100" />
          </Field>
        </div>
      </div>

      <NavButtons step={4} totalSteps={5} onBack={onBack} onNext={onNext} nextLabel="Review Event" />
    </StepCard>
  );
}

// ── Step 5: Review & Publish ───────────────────────────────────────────────
function Step5({ step1, days, spot, step4, onBack, onSubmit, loading, platformFeePercent, connectStatus }: {
  step1: Step1Data;
  days: EventDay[];
  spot: SpotConfig;
  step4: Step4Data;
  onBack: () => void;
  onSubmit: (publish: boolean) => void;
  loading: boolean;
  platformFeePercent: number;
  connectStatus: { onboardingComplete: boolean; connected: boolean } | null;
}) {
  const priceVal = parseFloat(spot.priceInDollars) || 0;

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ap}`;
  };

  const ReviewRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground min-w-[120px] shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/50 bg-muted/50">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );

  // Validation check
  const isReady = step1.name.trim() && step1.venueName.trim() && step1.city.trim() && days.length > 0 && spot.totalSlots >= 1;

  return (
    <StepCard title="Review & Publish" icon={<Eye className="w-5 h-5" />}>
      {!isReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-semibold mb-1">Missing required info:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {!step1.name.trim() && <li>Event name</li>}
              {!step1.venueName.trim() && <li>Venue name</li>}
              {!step1.city.trim() && <li>City</li>}
              {days.length === 0 && <li>At least one event day with times</li>}
              {spot.totalSlots < 1 && <li>Number of available spots</li>}
            </ul>
          </div>
        </div>
      )}

      <Section title="Event Details">
        <ReviewRow label="Name" value={<span className="font-semibold">{step1.name || "—"}</span>} />
        <ReviewRow label="Description" value={step1.description || <span className="text-muted-foreground italic">None</span>} />
        <ReviewRow label="Venue" value={`${step1.venueName}${step1.address ? `, ${step1.address}` : ""}, ${step1.city}`} />
        {step1.websiteUrl && <ReviewRow label="Website" value={step1.websiteUrl} />}
        <ReviewRow label="Type" value={step1.eventType === "public" ? "Public" : step1.eventType === "private" ? "Private" : "Public + Private area"} />
        {step1.expectedAttendance && <ReviewRow label="Attendance" value={`~${step1.expectedAttendance} expected`} />}
      </Section>

      <Section title="Schedule">
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center italic">No days added</p>
        ) : days.map((d, i) => (
          <ReviewRow
            key={d.id}
            label={d.label || `Day ${i + 1}`}
            value={
              <span>
                {d.date ? new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—"}
                {" · "}
                <span className="font-medium">{formatTime(d.startTime)} – {formatTime(d.endTime)}</span>
              </span>
            }
          />
        ))}
      </Section>

      <Section title="Food Truck Spots">
        <ReviewRow label="Spot Name" value={spot.name || "Vendor Spot"} />
        <ReviewRow label="Available Spots" value={<span className="font-semibold text-primary">{spot.totalSlots}</span>} />
        <ReviewRow label="Price" value={priceVal > 0 ? `$${priceVal.toFixed(2)} per spot` : <span className="text-green-600 font-medium">Free</span>} />
        <ReviewRow label="Booking Method" value={spot.isInstantBook ? "Reserve instantly" : "Application-based"} />
        <ReviewRow label="Payment timing" value={spot.isInstantBook ? "Vendors pay immediately on booking" : "Vendors pay after you approve their application"} />
        {spot.requirements && <ReviewRow label="Requirements" value={spot.requirements} />}
      </Section>

      {/* Payment breakdown */}
      {priceVal > 0 && (
        <Section title="Payment & Payout Summary">
          <ReviewRow label="Vendor pays" value={`$${priceVal.toFixed(2)} per spot`} />
          <ReviewRow label={`Platform fee (${platformFeePercent}%)`} value={<span className="text-muted-foreground">−${(priceVal * platformFeePercent / 100).toFixed(2)}</span>} />
          <ReviewRow label="You receive" value={<span className="font-bold text-primary">${(priceVal * (1 - platformFeePercent / 100)).toFixed(2)} per spot</span>} />
          <ReviewRow label="Max earnings" value={<span className="font-semibold">${(priceVal * (1 - platformFeePercent / 100) * spot.totalSlots).toFixed(2)} (if all {spot.totalSlots} spots filled)</span>} />
          <ReviewRow label="Stripe Connect" value={
            connectStatus?.onboardingComplete
              ? <span className="inline-flex items-center gap-1 text-green-600 font-medium"><CheckCircle className="w-3.5 h-3.5" />Connected — payouts enabled</span>
              : <span className="inline-flex items-center gap-1 text-amber-600 font-medium"><AlertTriangle className="w-3.5 h-3.5" />Not connected — vendors can't pay yet</span>
          } />
          {!connectStatus?.onboardingComplete && (
            <div className="py-2">
              <Link href="/organizer/connect">
                <button className="text-xs font-semibold text-primary underline underline-offset-2 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />Set up Stripe to receive payments
                </button>
              </Link>
            </div>
          )}
        </Section>
      )}

      {(step4.availableHookups !== "unknown" || step4.vendorFeeStructure !== "none" || step4.publicNotes || step4.contactEmail) && (
        <Section title="Logistics & Contact">
          {step4.availableHookups && step4.availableHookups !== "unknown" && <ReviewRow label="Hookups" value={step4.availableHookups.replace("_", " + ")} />}
          {step4.vendorFeeStructure !== "none" && <ReviewRow label="Fee" value={`${step4.vendorFeeStructure === "flat" ? `$${step4.spotFeeAmount} flat` : `${step4.spotFeeAmount}% of sales`}`} />}
          {step4.publicNotes && <ReviewRow label="Public notes" value={step4.publicNotes} />}
          {step4.contactEmail && <ReviewRow label="Contact" value={`${step4.contactFirstName} ${step4.contactLastName} — ${step4.contactEmail}`} />}
        </Section>
      )}

      <div className="pt-4 border-t border-border space-y-3">
        <button
          type="button"
          onClick={() => onSubmit(true)}
          disabled={!isReady || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md shadow-primary/20"
        >
          {loading ? "Publishing…" : <><CheckCircle className="w-4 h-4" />Publish Event</>}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(false)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
        >
          Save as Draft
        </button>
        <p className="text-xs text-muted-foreground text-center">Published events are visible to vendors and the public. Drafts are only visible to you.</p>
      </div>

      <NavButtons step={5} totalSteps={5} onBack={onBack} onNext={() => {}} nextLabel="—" nextDisabled={true} />
    </StepCard>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function OrganizerNewEvent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Platform fee and Stripe Connect status
  const [platformFeePercent, setPlatformFeePercent] = useState(10);
  const [connectStatus, setConnectStatus] = useState<{ onboardingComplete: boolean; connected: boolean } | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/api/platform/fee"))
      .then(r => r.json())
      .then(d => { if (d.feePercent !== undefined) setPlatformFeePercent(d.feePercent); })
      .catch(() => {});
    fetch(getApiUrl("/api/organizer/connect/status"), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setConnectStatus({ onboardingComplete: d.onboardingComplete ?? false, connected: d.connected ?? false }))
      .catch(() => setConnectStatus({ onboardingComplete: false, connected: false }));
  }, []);

  // Upload state
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Step 1
  const [step1, setStep1] = useState<Step1Data>({
    name: "", description: "", venueName: "", city: "Oklahoma City",
    address: "", websiteUrl: "", eventType: "public", expectedAttendance: "",
    bannerImageUrl: null, photoUrls: [],
  });

  // Step 2: schedule days
  const today = new Date().toISOString().split("T")[0];
  const [days, setDays] = useState<EventDay[]>([
    { id: "d1", date: today, startTime: "11:00", endTime: "21:00", label: "Day 1" },
  ]);

  // Step 3: spot config
  const [spot, setSpot] = useState<SpotConfig>({
    name: "Vendor Spot", totalSlots: 10, priceInDollars: "",
    isInstantBook: false, requirements: "", vendorRules: "",
  });

  // Step 4
  const [step4, setStep4] = useState<Step4Data>({
    availableHookups: "unknown", vendorFeeStructure: "none", spotFeeAmount: "",
    vendorPaymentMethod: "organizer", vendorNotes: "", publicNotes: "",
    contactFirstName: "", contactLastName: "", contactEmail: user?.email ?? "",
    contactPhone: "", additionalInfo: "",
  });

  // File upload handlers
  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingBanner(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(getApiUrl("/api/storage/upload"), { method: "POST", headers: authHeaders(), body: fd });
      const data = await res.json();
      if (data.url) setStep1(s => ({ ...s, bannerImageUrl: data.url }));
      else toast({ title: "Upload failed", variant: "destructive" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploadingBanner(false); }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploadingPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch(getApiUrl("/api/storage/upload"), { method: "POST", headers: authHeaders(), body: fd });
        const data = await res.json();
        if (data.url) uploaded.push(data.url);
      }
      setStep1(s => ({ ...s, photoUrls: [...s.photoUrls, ...uploaded] }));
      if (uploaded.length) toast({ title: `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded` });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploadingPhoto(false); e.target.value = ""; }
  }

  const handleSubmit = async (publish: boolean) => {
    setSubmitting(true);
    try {
      const priceInCents = Math.round((parseFloat(spot.priceInDollars) || 0) * 100);
      const payload: any = {
        name: step1.name,
        description: step1.description || null,
        venueName: step1.venueName,
        address: step1.address || null,
        city: step1.city,
        websiteUrl: step1.websiteUrl || null,
        eventType: step1.eventType || null,
        expectedAttendance: step1.expectedAttendance ? parseInt(step1.expectedAttendance) : null,
        bannerImageUrl: step1.bannerImageUrl,
        photoUrls: step1.photoUrls.length ? JSON.stringify(step1.photoUrls) : null,
        thumbnailUrl: step1.photoUrls[0] || step1.bannerImageUrl || null,
        isPublished: publish,
        publishedAt: publish ? new Date().toISOString() : null,

        availableHookups: step4.availableHookups !== "unknown" ? step4.availableHookups : null,
        vendorFeeStructure: step4.vendorFeeStructure || null,
        spotFeeAmount: step4.spotFeeAmount ? parseFloat(step4.spotFeeAmount) : null,
        vendorPaymentMethod: step4.vendorPaymentMethod || null,
        vendorNotes: step4.vendorNotes || null,
        publicNotes: step4.publicNotes || null,
        additionalInfo: step4.additionalInfo || null,
        contactFirstName: step4.contactFirstName || null,
        contactLastName: step4.contactLastName || null,
        contactEmail: step4.contactEmail || null,
        contactPhone: step4.contactPhone || null,

        days: days.map(d => ({ date: d.date, startTime: d.startTime, endTime: d.endTime, label: d.label })),

        spot: {
          name: spot.name || "Vendor Spot",
          totalSlots: spot.totalSlots,
          priceInCents,
          isInstantBook: spot.isInstantBook,
          requirements: spot.requirements || null,
          vendorRules: spot.vendorRules || null,
        },
      };

      const res = await fetch(getApiUrl("/api/events"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");

      toast({ title: publish ? "Event published! 🎉" : "Draft saved", description: publish ? "Vendors can now find and apply to your event." : "You can publish it from your dashboard." });
      setLocation(`/organizer/events/${data.id}/manage`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollTop = () => { window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goNext = (n: number) => { setStep(n); scrollTop(); };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/organizer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Dashboard
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground mt-3">Create New Event</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete each step to set up your event and food truck spots.</p>
        </div>

        <ProgressBar step={step} />

        {step === 1 && (
          <Step1
            data={step1}
            onChange={d => setStep1(s => ({ ...s, ...d }))}
            onNext={() => goNext(2)}
            uploadingBanner={uploadingBanner}
            onBannerUpload={handleBannerUpload}
            uploadingPhoto={uploadingPhoto}
            onPhotoUpload={handlePhotoUpload}
          />
        )}
        {step === 2 && (
          <Step2 days={days} onChange={setDays} onBack={() => goNext(1)} onNext={() => goNext(3)} />
        )}
        {step === 3 && (
          <Step3 spot={spot} onChange={p => setSpot(s => ({ ...s, ...p }))} onBack={() => goNext(2)} onNext={() => goNext(4)} platformFeePercent={platformFeePercent} connectStatus={connectStatus} />
        )}
        {step === 4 && (
          <Step4 data={step4} onChange={d => setStep4(s => ({ ...s, ...d }))} onBack={() => goNext(3)} onNext={() => goNext(5)} />
        )}
        {step === 5 && (
          <Step5 step1={step1} days={days} spot={spot} step4={step4} onBack={() => goNext(4)} onSubmit={handleSubmit} loading={submitting} platformFeePercent={platformFeePercent} connectStatus={connectStatus} />
        )}
      </div>
    </Layout>
  );
}
