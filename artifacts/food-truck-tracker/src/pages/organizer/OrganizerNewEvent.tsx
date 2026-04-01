import { useForm, useWatch } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useCreateEvent } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Calendar, MapPin, User, Zap, Info } from "lucide-react";
import { useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";

const inputClass = "w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
const labelClass = "block text-sm font-medium text-foreground mb-1";

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

export default function OrganizerNewEvent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const createMutation = useCreateEvent();
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      description: "",
      venueName: "",
      address: "",
      city: "Oklahoma City",
      startDateTime: "",
      endDateTime: "",
      publicNotes: "",
      vendorNotes: "",
      websiteUrl: "",
      isPublished: false,
      contactFirstName: "",
      contactLastName: "",
      contactEmail: user?.email ?? "",
      contactPhone: "",
      howHeardAboutUs: "",
      availableHookups: "unknown",
      vendorFeeStructure: "none",
      spotFeeAmount: "",
      vendorPaymentMethod: "organizer",
      expectedAttendance: "",
      eventType: "public",
      notificationMethod: "application",
      additionalInfo: "",
    }
  });

  const feeStructure = useWatch({ control, name: "vendorFeeStructure" });

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(getApiUrl("/api/storage/upload"), {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.url) setBannerUrl(data.url);
      else toast({ title: "Upload failed", variant: "destructive" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingBanner(false);
    }
  }

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const payload: any = {
        name: data.name,
        description: data.description || null,
        venueName: data.venueName,
        address: data.address || null,
        city: data.city,
        startDateTime: new Date(data.startDateTime).toISOString(),
        endDateTime: new Date(data.endDateTime).toISOString(),
        publicNotes: data.publicNotes || null,
        vendorNotes: data.vendorNotes || null,
        websiteUrl: data.websiteUrl || null,
        isPublished: !!data.isPublished,
        bannerImageUrl: bannerUrl,
        contactFirstName: data.contactFirstName || null,
        contactLastName: data.contactLastName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        howHeardAboutUs: data.howHeardAboutUs || null,
        availableHookups: data.availableHookups || null,
        vendorFeeStructure: data.vendorFeeStructure || null,
        spotFeeAmount: data.spotFeeAmount ? parseFloat(data.spotFeeAmount) : null,
        vendorPaymentMethod: data.vendorPaymentMethod || null,
        expectedAttendance: data.expectedAttendance ? parseInt(data.expectedAttendance) : null,
        eventType: data.eventType || null,
        notificationMethod: data.notificationMethod || null,
        additionalInfo: data.additionalInfo || null,
      };

      const event = await createMutation.mutateAsync({ data: payload });
      toast({ title: "Event created!" });
      setLocation(`/organizer/events/${event.id}/manage`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/organizer" className="text-muted-foreground hover:text-primary text-sm">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Create New Event</h1>
          <p className="text-muted-foreground text-sm mt-1">Fill in the basics now — you can always edit later.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Event Details */}
          <Section icon={<Calendar className="w-4 h-4" />} title="Event Details" description="Name, date, venue">
            <div>
              <label className={labelClass}>Event Name *</label>
              <input {...register("name", { required: "Event name is required" })} className={inputClass} placeholder="Midtown Food Truck Rally" />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message as string}</p>}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea {...register("description")} rows={3} className={inputClass + " resize-none"} placeholder="Describe your event..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Venue Name *</label>
                <input {...register("venueName", { required: "Venue is required" })} className={inputClass} placeholder="Scissortail Park" />
                {errors.venueName && <p className="text-destructive text-sm mt-1">{errors.venueName.message as string}</p>}
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input {...register("city", { required: true })} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Street Address</label>
              <input {...register("address")} className={inputClass} placeholder="300 SW 7th St" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Start Date & Time *</label>
                <input {...register("startDateTime", { required: true })} type="datetime-local" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Date & Time *</label>
                <input {...register("endDateTime", { required: true })} type="datetime-local" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Website / More Info URL</label>
              <input {...register("websiteUrl")} type="url" className={inputClass} placeholder="https://..." />
            </div>

            <div>
              <label className={labelClass}>Event Type</label>
              <select {...register("eventType")} className={inputClass}>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="both">Public + Private area</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Expected Attendance</label>
              <input {...register("expectedAttendance")} type="number" min={0} className={inputClass} placeholder="500" />
            </div>

            {/* Banner Image */}
            <div>
              <label className={labelClass}>Banner Image</label>
              {bannerUrl ? (
                <div className="relative rounded-xl overflow-hidden h-36 mb-2">
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setBannerUrl(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full px-2 py-0.5 text-xs">Remove</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <span className="text-sm text-muted-foreground">{uploadingBanner ? "Uploading…" : "Click to upload banner image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner} />
                </label>
              )}
            </div>
          </Section>

          {/* Contact Information */}
          <Section icon={<User className="w-4 h-4" />} title="Contact Information" description="Who's the primary contact for this event?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input {...register("contactFirstName")} className={inputClass} placeholder="Jane" />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input {...register("contactLastName")} className={inputClass} placeholder="Smith" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contact Email</label>
                <input {...register("contactEmail")} type="email" className={inputClass} placeholder="you@example.com" />
              </div>
              <div>
                <label className={labelClass}>Contact Phone</label>
                <input {...register("contactPhone")} type="tel" className={inputClass} placeholder="(405) 555-0100" />
              </div>
            </div>
            <div>
              <label className={labelClass}>How did you hear about RoamBites?</label>
              <input {...register("howHeardAboutUs")} className={inputClass} placeholder="Google, friend referral, social media..." />
            </div>
          </Section>

          {/* Logistics */}
          <Section icon={<Zap className="w-4 h-4" />} title="Logistics" description="Hookups, fees, and vendor terms">
            <div>
              <label className={labelClass}>Available Hookups</label>
              <select {...register("availableHookups")} className={inputClass}>
                <option value="unknown">Not sure yet</option>
                <option value="water_electric">Water + Electric</option>
                <option value="water_only">Water only</option>
                <option value="electric_only">Electric only</option>
                <option value="none">None</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Vendor Fee Structure</label>
              <select {...register("vendorFeeStructure")} className={inputClass}>
                <option value="none">No fee — free to participate</option>
                <option value="flat">Flat fee per truck</option>
                <option value="percentage">Percentage of sales</option>
              </select>
            </div>

            {(feeStructure === "flat" || feeStructure === "percentage") && (
              <div>
                <label className={labelClass}>
                  {feeStructure === "flat" ? "Flat Fee Amount ($)" : "Percentage (%)"}
                </label>
                <input {...register("spotFeeAmount")} type="number" step="0.01" min={0} className={inputClass} placeholder={feeStructure === "flat" ? "50.00" : "10"} />
              </div>
            )}

            {feeStructure !== "none" && (
              <div>
                <label className={labelClass}>Who pays the fee?</label>
                <select {...register("vendorPaymentMethod")} className={inputClass}>
                  <option value="organizer">Organizer pays vendors (reverse)</option>
                  <option value="attendees">Vendors pay from their sales</option>
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Truck Notification Method</label>
              <select {...register("notificationMethod")} className={inputClass}>
                <option value="application">Application-based (trucks apply)</option>
                <option value="list">Invitation list (organizer invites)</option>
              </select>
            </div>
          </Section>

          {/* Public Notes & Vendor Notes */}
          <Section icon={<Info className="w-4 h-4" />} title="Notes & Additional Info">
            <div>
              <label className={labelClass}>Public Notes <span className="text-muted-foreground font-normal">(visible to everyone)</span></label>
              <input {...register("publicNotes")} className={inputClass} placeholder="Parking available at..." />
            </div>
            <div>
              <label className={labelClass}>Vendor Notes <span className="text-muted-foreground font-normal">(only shown to confirmed vendors)</span></label>
              <textarea {...register("vendorNotes")} rows={3} className={inputClass + " resize-none"} placeholder="Load-in instructions, check-in time, etc." />
            </div>
            <div>
              <label className={labelClass}>Anything else we should know?</label>
              <textarea {...register("additionalInfo")} rows={2} className={inputClass + " resize-none"} placeholder="Special requirements, parking instructions, etc." />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input {...register("isPublished")} type="checkbox" id="isPublished" className="w-4 h-4 accent-primary" />
              <label htmlFor="isPublished" className="text-sm text-foreground">Publish immediately (visible to public and vendors)</label>
            </div>
          </Section>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {submitting ? "Creating…" : <>Create Event <ChevronRight className="w-4 h-4" /></>}
            </button>
            <Link href="/organizer">
              <button type="button" className="px-4 py-3 bg-muted text-muted-foreground rounded-xl hover:opacity-90">
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
