import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Shield, Calendar, Heart, Star, Bell, LogOut, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { format } from "date-fns";

export default function Profile() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setDataLoading(false); return; }
    Promise.all([
      fetch(getApiUrl("/api/favorites"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch(getApiUrl("/api/notifications"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
    ]).then(([favs, notifs]) => {
      setFavorites(Array.isArray(favs) ? favs : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
      setDataLoading(false);
    });
  }, [isAuthenticated]);

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
    if (user.role === "admin") return { href: "/admin", label: "Admin Panel" };
    return null;
  };
  const dashboardLink = getDashboardLink();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10 p-6 bg-card rounded-3xl border border-border shadow-sm">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/20 flex-shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-foreground">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="capitalize text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{user.role}</span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
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
            <Link href="/favorites" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">My Favorites</p>
                <p className="text-sm text-muted-foreground">{favorites.length} saved truck{favorites.length !== 1 ? "s" : ""}</p>
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
