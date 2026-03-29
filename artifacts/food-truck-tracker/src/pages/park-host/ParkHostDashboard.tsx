import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/api";
import { MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Wifi, Zap, Droplets, Users, Globe, Phone, Save, X, DollarSign, Calendar, Truck, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vacancy {
  id: number;
  title: string;
  description: string | null;
  spotsAvailable: number;
  startDate: string | null;
  endDate: string | null;
  dailyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  isActive: boolean;
}

interface Park {
  id: number;
  name: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  imageUrl: string | null;
  amenities: string[];
  maxTrucks: number | null;
  isActive: boolean;
  vacancies: Vacancy[];
}

const AMENITY_OPTIONS = ["WiFi", "Power", "Water", "Restrooms", "Security", "Lighting", "Paved", "Covered"];

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function VacancyForm({ parkId, vacancy, onSave, onCancel }: {
  parkId: number;
  vacancy?: Vacancy;
  onSave: (v: Vacancy) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: vacancy?.title ?? "",
    description: vacancy?.description ?? "",
    spotsAvailable: vacancy?.spotsAvailable ?? 1,
    startDate: vacancy?.startDate ?? "",
    endDate: vacancy?.endDate ?? "",
    dailyRate: vacancy?.dailyRate ?? "",
    weeklyRate: vacancy?.weeklyRate ?? "",
    monthlyRate: vacancy?.monthlyRate ?? "",
  });

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = vacancy
        ? getApiUrl(`/api/vacancies/${vacancy.id}`)
        : getApiUrl(`/api/parks/${parkId}/vacancies`);
      const method = vacancy ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      onSave(saved);
      toast({ title: vacancy ? "Vacancy updated" : "Vacancy added" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-muted/50 border border-border rounded-2xl p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Weekday morning spots available"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Details about this availability..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Spots available</label>
          <input
            type="number"
            min={1}
            value={form.spotsAvailable}
            onChange={(e) => setForm({ ...form, spotsAvailable: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">End date (optional)</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Daily rate ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.dailyRate}
            onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Weekly rate ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.weeklyRate}
            onChange={(e) => setForm({ ...form, weeklyRate: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Monthly rate ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.monthlyRate}
            onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : (vacancy ? "Update" : "Add Vacancy")}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

function ParkProfileForm({ park, onSave }: { park?: Park; onSave: (p: Park) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: park?.name ?? "",
    description: park?.description ?? "",
    address: park?.address ?? "",
    city: park?.city ?? "",
    latitude: park?.latitude ?? "",
    longitude: park?.longitude ?? "",
    website: park?.website ?? "",
    phone: park?.phone ?? "",
    maxTrucks: park?.maxTrucks ?? "",
    amenities: park?.amenities ?? [] as string[],
  });

  const toggleAmenity = (a: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      toast({ title: "Name, address, and city are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = park ? getApiUrl(`/api/parks/${park.id}`) : getApiUrl("/api/parks");
      const method = park ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      onSave({ ...saved, vacancies: park?.vacancies ?? [] });
      toast({ title: park ? "Park updated" : "Park created!" });
    } catch {
      toast({ title: "Failed to save park", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Park name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Eastside Food Truck Lot" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell trucks what makes your park great..." rows={3} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Street address *</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">City *</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Oklahoma City" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max trucks</label>
          <input type="number" min={1} value={form.maxTrucks} onChange={(e) => setForm({ ...form, maxTrucks: e.target.value })} placeholder="10" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Latitude</label>
          <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="35.4676" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Longitude</label>
          <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-97.5164" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(405) 555-0100" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Website</label>
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://mypark.com" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Amenities</label>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${form.amenities.includes(a) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-primary/40"}`}
            >
              {form.amenities.includes(a) && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
              {a}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 disabled:opacity-50">
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : (park ? "Save Changes" : "Create My Park")}
      </button>
    </div>
  );
}

export default function ParkHostDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [park, setPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editingPark, setEditingPark] = useState(false);
  const [addingVacancy, setAddingVacancy] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("token");
    fetch(getApiUrl("/api/my-park"), { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return; }
        if (!r.ok) throw new Error();
        setPark(await r.json());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated || (user && user.role !== "park_host" && user.role !== "admin")) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-muted-foreground mt-2">This area is for Truck Park Hosts only.</p>
          <Link href="/signup"><button className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Sign up as a Park Host</button></Link>
        </div>
      </Layout>
    );
  }

  const handleDeleteVacancy = async (id: number) => {
    if (!confirm("Delete this vacancy?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(getApiUrl(`/api/vacancies/${id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPark((p) => p ? { ...p, vacancies: p.vacancies.filter((v) => v.id !== id) } : p);
      toast({ title: "Vacancy deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggleVacancy = async (vacancy: Vacancy) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/vacancies/${vacancy.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !vacancy.isActive }),
      });
      const updated = await res.json();
      setPark((p) => p ? { ...p, vacancies: p.vacancies.map((v) => v.id === updated.id ? updated : v) } : p);
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const activeVacancies = park?.vacancies.filter((v) => v.isActive) ?? [];
  const totalOpenSpots = activeVacancies.reduce((s, v) => s + v.spotsAvailable, 0);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Park Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your truck park profile and vacancy listings.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 rounded-2xl bg-muted animate-pulse" />
            <div className="h-48 rounded-2xl bg-muted animate-pulse" />
          </div>
        ) : !park || notFound ? (
          /* No park yet — create one */
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Set up your park profile</h2>
              <p className="text-muted-foreground mt-2">Add your park details so trucks can find you in the marketplace.</p>
            </div>
            <ParkProfileForm onSave={(p) => { setPark(p); setNotFound(false); }} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{totalOpenSpots}</p>
                <p className="text-sm text-muted-foreground mt-1">Open spots</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{activeVacancies.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Active listings</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{park.maxTrucks ?? "—"}</p>
                <p className="text-sm text-muted-foreground mt-1">Max capacity</p>
              </div>
            </div>

            {/* Park Profile */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Park Profile</h2>
                <div className="flex items-center gap-2">
                  <Link href={`/parks/${park.id}`}>
                    <button className="text-sm text-primary font-medium hover:underline">View public page →</button>
                  </Link>
                  <button onClick={() => setEditingPark(!editingPark)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                {editingPark ? (
                  <ParkProfileForm park={park} onSave={(p) => { setPark(p); setEditingPark(false); }} />
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{park.name}</h3>
                      {park.description && <p className="text-sm text-muted-foreground mt-1">{park.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{park.address}, {park.city}</span>
                      {park.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{park.phone}</span>}
                      {park.website && <a href={park.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="w-4 h-4" />Website</a>}
                    </div>
                    {park.amenities && park.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {park.amenities.map((a) => (
                          <span key={a} className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground text-xs capitalize">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Vacancies */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Vacancy Listings</h2>
                <button
                  onClick={() => { setAddingVacancy(true); setEditingVacancy(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Vacancy
                </button>
              </div>
              <div className="p-6 space-y-4">
                {addingVacancy && (
                  <VacancyForm
                    parkId={park.id}
                    onSave={(v) => { setPark((p) => p ? { ...p, vacancies: [v, ...p.vacancies] } : p); setAddingVacancy(false); }}
                    onCancel={() => setAddingVacancy(false)}
                  />
                )}
                {park.vacancies.length === 0 && !addingVacancy ? (
                  <div className="text-center py-8">
                    <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No vacancies yet. Add your first listing to attract trucks.</p>
                  </div>
                ) : (
                  park.vacancies.map((v) => (
                    <div key={v.id}>
                      {editingVacancy?.id === v.id ? (
                        <VacancyForm
                          parkId={park.id}
                          vacancy={v}
                          onSave={(updated) => { setPark((p) => p ? { ...p, vacancies: p.vacancies.map((x) => x.id === updated.id ? updated : x) } : p); setEditingVacancy(null); }}
                          onCancel={() => setEditingVacancy(null)}
                        />
                      ) : (
                        <div className={`border rounded-2xl p-4 transition-all ${v.isActive ? "border-border bg-background" : "border-border/50 bg-muted/30 opacity-60"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground">{v.title}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                                  {v.isActive ? "Active" : "Paused"}
                                </span>
                              </div>
                              {v.description && <p className="text-sm text-muted-foreground mt-1">{v.description}</p>}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{v.spotsAvailable} spot{v.spotsAvailable !== 1 ? "s" : ""}</span>
                                {(v.startDate || v.endDate) && (
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{v.startDate || "—"} → {v.endDate || "ongoing"}</span>
                                )}
                                {(v.dailyRate || v.weeklyRate || v.monthlyRate) && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {[v.dailyRate && `$${v.dailyRate}/day`, v.weeklyRate && `$${v.weeklyRate}/wk`, v.monthlyRate && `$${v.monthlyRate}/mo`].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => handleToggleVacancy(v)} title={v.isActive ? "Pause" : "Activate"} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                                {v.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <button onClick={() => { setEditingVacancy(v); setAddingVacancy(false); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteVacancy(v.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
