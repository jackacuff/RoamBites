import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Shield, Heart, Star, Bell, LogOut, Loader2, Save, Edit2, X, Check, Lock, Unlock, MapPin, BellOff, ExternalLink, Calendar, ChevronRight, ShieldCheck, ShieldAlert, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className="relative shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted border border-border"}`} />
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </label>
  );
}

function NotificationDialog({ notif, onClose, onUpdate, onRemove }: {
  notif: any;
  onClose: () => void;
  onUpdate: (id: number, truckId: number, open: boolean, nearby: boolean) => void;
  onRemove: (truckId: number) => void;
}) {
  const [open, setOpen] = useState(notif.notifyWhenOpen);
  const [nearby, setNearby] = useState(notif.notifyWhenNearby);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();
  const fallback = `${import.meta.env.BASE_URL}images/truck-placeholder.png`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(getApiUrl("/api/notifications"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ truckId: notif.truckId, notifyWhenOpen: open, notifyWhenNearby: nearby }),
      });
      onUpdate(notif.id, notif.truckId, open, nearby);
      toast({ title: "Notification preferences saved" });
      onClose();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await fetch(getApiUrl(`/api/notifications/${notif.truckId}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      onRemove(notif.truckId);
      toast({ title: "Stopped tracking truck" });
      onClose();
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    } finally { setRemoving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        {/* Truck image header */}
        <div className="relative h-36 bg-muted overflow-hidden">
          <img
            src={notif.truckImageUrl || fallback}
            alt={notif.truckName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {notif.truckIsLive && (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE NOW
            </span>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-lg font-display font-bold text-foreground mb-0.5">{notif.truckName || `Truck #${notif.truckId}`}</h3>
          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
            {notif.truckCuisine && <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground text-xs font-medium">{notif.truckCuisine}</span>}
            {notif.truckCity && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {notif.truckCity}
              </span>
            )}
          </div>

          <div className="space-y-4 mb-5 p-4 bg-muted/40 rounded-2xl border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notify me when…</p>
            <Toggle checked={open} onChange={setOpen} label="This truck opens for service" />
            <Toggle checked={nearby} onChange={setNearby} label="This truck is nearby my location" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
            <Link
              href={`/trucks/${notif.truckSlug || notif.truckId}`}
              className="px-3 py-2.5 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              title="View truck"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="px-3 py-2.5 border border-destructive/30 rounded-xl text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
              title="Stop tracking"
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", twitterHandle: "", instagramHandle: "", facebookUrl: "", isPrivate: false });
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradingRole, setUpgradingRole] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [resendDone, setResendDone] = useState(false);

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
      isPrivate: profile?.isPrivate ?? false,
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

  const handleNotifUpdate = (id: number, truckId: number, open: boolean, nearby: boolean) => {
    setNotifications(prev => prev.map(n =>
      n.truckId === truckId ? { ...n, notifyWhenOpen: open, notifyWhenNearby: nearby } : n
    ));
  };

  const handleNotifRemove = (truckId: number) => {
    setNotifications(prev => prev.filter(n => n.truckId !== truckId));
  };

  const handleUpgradeToOrganizer = async () => {
    setUpgradingRole(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/upgrade-to-organizer"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Upgrade failed");
      }
      toast({ title: "Upgraded to Organizer!", description: "Redirecting to your organizer dashboard…" });
      setTimeout(() => { window.location.href = "/organizer"; }, 1200);
    } catch (err: any) {
      toast({ title: "Could not upgrade", description: err.message, variant: "destructive" });
    } finally {
      setUpgradingRole(false);
      setShowUpgradeModal(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.current) { setPwError("Current password is required."); return; }
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    setPwError(null);
    try {
      const res = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to change password.");
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed successfully!" });
    } catch (err: any) {
      setPwError(err?.message ?? "Something went wrong.");
    } finally { setPwLoading(false); }
  };

  const handleResendVerification = async () => {
    setResendingVerif(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send verification email.");
      setResendDone(true);
      toast({ title: "Verification email sent!", description: "Check your inbox." });
    } catch (err: any) {
      toast({ title: err?.message ?? "Error sending email", variant: "destructive" });
    } finally { setResendingVerif(false); }
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
  const isPrivate = profile?.isPrivate ?? false;

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-foreground">{profile?.name || user.name}</h1>
              {isPrivate && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-xs text-muted-foreground font-medium">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-sm">{user.email}</span>
              {(profile?.emailVerified ?? user.emailVerified) ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-medium">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                  <ShieldAlert className="w-3 h-3" /> Unverified
                </span>
              )}
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

              {/* Privacy Toggle */}
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      {form.isPrivate ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
                      Private Profile
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, your profile is hidden from public view and your reviews appear as <strong>Anonymous</strong>.
                    </p>
                  </div>
                  <label className="relative shrink-0 cursor-pointer mt-0.5">
                    <input type="checkbox" className="sr-only" checked={form.isPrivate} onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${form.isPrivate ? "bg-primary" : "bg-muted border border-border"}`} />
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${form.isPrivate ? "translate-x-4" : ""}`} />
                  </label>
                </div>
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

        {/* Account Security */}
        <div className="mb-10 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Account Security</h2>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Email verification status */}
            {!(profile?.emailVerified ?? user.emailVerified) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Email not verified</p>
                    <p className="text-xs text-amber-700 mt-0.5">Verify your email to unlock full account access and important actions.</p>
                  </div>
                </div>
                {resendDone ? (
                  <span className="flex items-center gap-1.5 text-xs text-accent font-medium shrink-0">
                    <Check className="w-3.5 h-3.5" /> Sent! Check your inbox
                  </span>
                ) : (
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerif}
                    className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {resendingVerif ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Resend verification email
                  </button>
                )}
              </div>
            )}

            {/* Change Password */}
            <div>
              <button
                onClick={() => { setShowChangePassword(!showChangePassword); setPwError(null); setPwSuccess(false); }}
                className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Change password
                </span>
                <span className="text-xs text-muted-foreground">{showChangePassword ? "Cancel" : "Update →"}</span>
              </button>

              {showChangePassword && (
                <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                  {pwError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      {pwError}
                    </div>
                  )}
                  {pwSuccess && (
                    <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg text-accent text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      Password changed successfully!
                    </div>
                  )}
                  {[
                    { key: "current" as const, label: "Current password", placeholder: "Your current password" },
                    { key: "next" as const, label: "New password", placeholder: "At least 6 characters" },
                    { key: "confirm" as const, label: "Confirm new password", placeholder: "Repeat new password" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={pwForm[f.key]}
                          onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full px-3 pr-10 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {f.key === "current" && (
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {pwLoading ? "Saving…" : "Save password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChangePassword(false)}
                      className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

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
            <>
              <Link href="/favorites" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">My Favorites</p>
                  <p className="text-sm text-muted-foreground">{favorites.length} favorited truck{favorites.length !== 1 ? "s" : ""}</p>
                </div>
              </Link>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/30 hover:border-secondary/60 hover:shadow-sm transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-secondary transition-colors">Host an Event</p>
                  <p className="text-sm text-muted-foreground">Upgrade to Organizer — create events and book trucks</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-secondary transition-colors shrink-0" />
              </button>
            </>
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

        {/* Notification Prefs — clickable truck cards */}
        {notifications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-foreground">Tracked Trucks</h2>
              <span className="text-xs text-muted-foreground">Tap a truck to manage alerts</span>
            </div>
            <div className="space-y-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNotif(n)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  {/* Truck thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                    <img
                      src={n.truckImageUrl || `${import.meta.env.BASE_URL}images/truck-placeholder.png`}
                      alt={n.truckName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {n.truckName || `Truck #${n.truckId}`}
                    </p>
                    {n.truckCuisine && <p className="text-xs text-muted-foreground truncate">{n.truckCuisine}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {n.notifyWhenOpen && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-medium">
                        Open
                      </span>
                    )}
                    {n.notifyWhenNearby && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-medium">
                        Nearby
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notification Dialog */}
      {selectedNotif && (
        <NotificationDialog
          notif={selectedNotif}
          onClose={() => setSelectedNotif(null)}
          onUpdate={handleNotifUpdate}
          onRemove={handleNotifRemove}
        />
      )}

      {/* Host an Event Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10">
              <X className="w-4 h-4" />
            </button>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">Become an Event Organizer</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Upgrade your account to unlock event hosting — create events, fill lineup spots, and collect fees via Stripe.
              </p>
              <ul className="space-y-2 mb-6">
                {["Create and publish events", "Browse the food truck marketplace", "Collect spot fees via Stripe Connect", "Manage vendor invitations and applications"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleUpgradeToOrganizer}
                disabled={upgradingRole}
                className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {upgradingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                {upgradingRole ? "Upgrading…" : "Upgrade to Organizer — Free"}
              </button>
              <p className="text-xs text-muted-foreground text-center mt-3">No credit card required to get started.</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
