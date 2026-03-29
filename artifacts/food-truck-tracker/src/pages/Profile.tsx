import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Shield, Heart, Star, Bell, LogOut, Loader2, Save, Edit2, X, Check } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SocialShareButton } from "@/components/SocialShare";

const SocialIcon = ({ type }: { type: string }) => {
  if (type === "twitter") return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
  );
  if (type === "instagram") return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
  );
  if (type === "facebook") return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
  );
  return null;
};

export default function Profile() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", twitterHandle: "", instagramHandle: "", facebookUrl: "" });

  useEffect(() => {
    if (!isAuthenticated) { setDataLoading(false); return; }
    Promise.all([
      fetch(getApiUrl("/api/favorites"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch(getApiUrl("/api/notifications"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch(getApiUrl("/api/auth/me"), { headers: authHeaders() }).then(r => r.json()).catch(() => null),
    ]).then(([favs, notifs, me]) => {
      setFavorites(Array.isArray(favs) ? favs : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
      if (me) setProfile(me);
      setDataLoading(false);
    });
  }, [isAuthenticated]);

  const startEdit = () => {
    setForm({
      name: profile?.name || user?.name || "",
      twitterHandle: profile?.twitterHandle || "",
      instagramHandle: profile?.instagramHandle || "",
      facebookUrl: profile?.facebookUrl || "",
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/profile"), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setProfile(updated);
      setEditing(false);
      toast({ title: "Profile updated!" });
    } catch {
      toast({ title: "Error saving profile", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">Sign in to view your profile</h1>
          <Link href="/login" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-md hover:-translate-y-0.5 transition-all inline-block">
            Log In
          </Link>
        </div>
      </Layout>
    );
  }

  const activeNotifications = notifications.filter(n => n.notifyWhenOpen || n.notifyWhenNearby);
  const getDashboardLink = () => {
    if (user.role === "vendor") return { href: "/vendor", label: "Vendor Dashboard" };
    if (user.role === "organizer") return { href: "/organizer", label: "Organizer Dashboard" };
    if (user.role === "admin" || user.role === "superadmin") return { href: "/admin", label: "Admin Panel" };
    return null;
  };
  const dashboardLink = getDashboardLink();

  const socialLinks = [
    profile?.twitterHandle && { type: "twitter", label: `@${profile.twitterHandle}`, url: `https://twitter.com/${profile.twitterHandle}` },
    profile?.instagramHandle && { type: "instagram", label: `@${profile.instagramHandle}`, url: `https://instagram.com/${profile.instagramHandle}` },
    profile?.facebookUrl && { type: "facebook", label: "Facebook", url: profile.facebookUrl },
  ].filter(Boolean) as { type: string; label: string; url: string }[];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10 p-6 bg-card rounded-3xl border border-border shadow-sm">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/20 flex-shrink-0">
            {(profile?.name || user.name)?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-foreground">{profile?.name || user.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="capitalize text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{user.role}</span>
            </div>
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {socialLinks.map(s => (
                  <a key={s.type} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <SocialIcon type={s.type} />
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/50 text-sm font-medium transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {editing && (
          <div className="mb-10 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
              <button onClick={() => setEditing(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                  placeholder="Your name"
                />
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground mb-3">Social Media Links</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">X (Twitter) handle</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        value={form.twitterHandle}
                        onChange={e => setForm(f => ({ ...f, twitterHandle: e.target.value.replace(/^@/, "") }))}
                        className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                        placeholder="yourhandle"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Instagram handle</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        value={form.instagramHandle}
                        onChange={e => setForm(f => ({ ...f, instagramHandle: e.target.value.replace(/^@/, "") }))}
                        className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                        placeholder="yourhandle"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Facebook URL</label>
                    <input
                      value={form.facebookUrl}
                      onChange={e => setForm(f => ({ ...f, facebookUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <Heart className="w-6 h-6 text-red-500 fill-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{dataLoading ? "—" : favorites.length}</p>
            <p className="text-sm text-muted-foreground">Favorites</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <Bell className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{dataLoading ? "—" : activeNotifications.length}</p>
            <p className="text-sm text-muted-foreground">Tracked Trucks</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center col-span-2 sm:col-span-1">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">—</p>
            <p className="text-sm text-muted-foreground">Reviews Written</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3 mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Quick Links</h2>
          {user.role === "customer" && (
            <Link href="/favorites" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">My Favorites</p>
                <p className="text-sm text-muted-foreground">{favorites.length} favorited truck{favorites.length !== 1 ? "s" : ""}</p>
              </div>
            </Link>
          )}
          {dashboardLink && (
            <Link href={dashboardLink.href} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{dashboardLink.label}</p>
                <p className="text-sm text-muted-foreground">Manage your {user.role} account</p>
              </div>
            </Link>
          )}
          <Link href="/trucks" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Discover Trucks</p>
              <p className="text-sm text-muted-foreground">Find and review food trucks near you</p>
            </div>
          </Link>
        </div>

        {/* Notification Prefs */}
        {activeNotifications.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Notification Preferences</h2>
            <div className="space-y-2">
              {activeNotifications.map(n => (
                <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border text-sm">
                  <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">Truck #{n.truckId}</span>
                  <div className="flex gap-2 ml-auto">
                    {n.notifyWhenOpen && <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-medium">When Open</span>}
                    {n.notifyWhenNearby && <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-medium">Nearby</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
