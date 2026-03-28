import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Megaphone, Plus, Trash2, Tag, Loader2, ToggleLeft, ToggleRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface Special {
  id: number;
  title: string;
  body: string | null;
  type: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  announcement: { label: "Announcement", color: "bg-blue-100 text-blue-700" },
  special: { label: "Special", color: "bg-orange-100 text-orange-700" },
  discount: { label: "Discount", color: "bg-green-100 text-green-700" },
  event: { label: "Event", color: "bg-purple-100 text-purple-700" },
};

export default function VendorSpecials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "announcement", expiresAt: "" });

  const load = () => {
    setLoading(true);
    fetch(getApiUrl("/api/vendor/specials"), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSpecials(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(getApiUrl("/api/vendor/specials"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Posted!", description: "Your announcement is now live." });
      setForm({ title: "", body: "", type: "announcement", expiresAt: "" });
      setShowForm(false);
      load();
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleActive = async (s: Special) => {
    await fetch(getApiUrl(`/api/vendor/specials/${s.id}`), {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  };

  const deleteSpecial = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    await fetch(getApiUrl(`/api/vendor/specials/${id}`), { method: "DELETE", headers: authHeaders() });
    toast({ title: "Deleted" });
    load();
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/vendor" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-primary" /> Specials & Announcements
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Post specials, discounts, or announcements that appear on your truck's profile.</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              New Post
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Create New Post</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Half-price tacos today!"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Details (optional)</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Add more details about your special..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="special">Special</option>
                    <option value="discount">Discount</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Expires (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? "Posting..." : "Post Now"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : specials.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
            <Tag className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
            <p className="text-foreground font-medium mb-1">No posts yet</p>
            <p className="text-sm text-muted-foreground">Create your first special or announcement to engage customers.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {specials.map(s => {
              const meta = TYPE_LABELS[s.type] ?? TYPE_LABELS.announcement;
              const expired = s.expiresAt && new Date(s.expiresAt) < new Date();
              return (
                <div key={s.id} className={`bg-card border rounded-2xl p-5 shadow-sm ${!s.isActive || expired ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                        {!s.isActive && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">Inactive</span>}
                        {expired && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive">Expired</span>}
                      </div>
                      <p className="font-semibold text-foreground">{s.title}</p>
                      {s.body && <p className="text-sm text-muted-foreground mt-1">{s.body}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Posted {format(new Date(s.createdAt), "MMM d, yyyy")}</span>
                        {s.expiresAt && <span>Expires {format(new Date(s.expiresAt), "MMM d, yyyy 'at' h:mm a")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(s)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title={s.isActive ? "Deactivate" : "Activate"}
                      >
                        {s.isActive ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => deleteSpecial(s.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
