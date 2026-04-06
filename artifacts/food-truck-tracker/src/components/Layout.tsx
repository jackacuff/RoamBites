import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  UtensilsCrossed, Menu, X, LogOut, User, Heart, ChevronDown, Crown,
  AlertTriangle, Inbox, Truck, CreditCard, MapPin, Calendar, Search,
  LayoutDashboard, Briefcase, Wifi, Building2, BarChart2, Plus,
  Radio, Star, Flame, CalendarRange, TrendingUp, Zap, Settings,
  ChevronRight, ShieldCheck, Map,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function useUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const fetchCount = () => {
      fetch("/api/messages/unread-count", { headers: getAuthHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && typeof d.count === "number") setCount(d.count); })
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [enabled]);
  return count;
}

// ─── Menu Config Types ────────────────────────────────────────────────────────

type BadgeColor = "green" | "orange" | "red" | "blue";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: BadgeColor;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type PrimaryCta = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type SummaryItem = {
  label: string;
  icon: React.ReactNode;
  value?: string;
  color?: string;
};

type RoleMenuConfig = {
  primaryCta?: PrimaryCta;
  summaryItems?: SummaryItem[];
  sections: MenuSection[];
};

// ─── Role Menu Configs ────────────────────────────────────────────────────────
// Edit this object to change the menu for any role.
// Badges can be injected at render time using the `getRoleConfig` function below.

function getRoleConfig(
  role: string,
  opts: { unreadCount: number }
): RoleMenuConfig {
  const { unreadCount } = opts;

  const configs: Record<string, RoleMenuConfig> = {

    // ── Customer ──────────────────────────────────────────────────────────────
    customer: {
      summaryItems: [
        { label: "Find food trucks serving near you", icon: <MapPin className="w-3.5 h-3.5" />, color: "text-primary" },
        { label: "Discover events happening today", icon: <Calendar className="w-3.5 h-3.5" />, color: "text-blue-500" },
        { label: "Browse dedicated truck parks", icon: <Building2 className="w-3.5 h-3.5" />, color: "text-green-600" },
      ],
      sections: [
        {
          title: "Discover",
          items: [
            { label: "Find Food", href: "/trucks", icon: <Search className="w-4 h-4" /> },
            { label: "Events Near Me", href: "/events", icon: <Calendar className="w-4 h-4" /> },
            { label: "Food Truck Parks", href: "/parks", icon: <Building2 className="w-4 h-4" /> },
            { label: "Trending Now", href: "/trucks", icon: <Flame className="w-4 h-4" /> },
          ],
        },
        {
          title: "My Stuff",
          items: [
            { label: "Saved Trucks", href: "/favorites", icon: <Heart className="w-4 h-4" /> },
            { label: "My Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
            {
              label: "Messages",
              href: "/vendor/inbox",
              icon: <Inbox className="w-4 h-4" />,
              ...(unreadCount > 0 ? { badge: unreadCount, badgeColor: "red" as BadgeColor } : {}),
            },
          ],
        },
        {
          title: "For Vendors",
          items: [
            { label: "List Your Truck", href: "/signup?role=vendor", icon: <Truck className="w-4 h-4" /> },
            { label: "Host an Event", href: "/signup?role=organizer", icon: <Star className="w-4 h-4" /> },
          ],
        },
      ],
    },

    // ── Vendor ────────────────────────────────────────────────────────────────
    vendor: {
      primaryCta: {
        label: "Find Gigs",
        href: "/vendor/event-spots",
        icon: <Briefcase className="w-4 h-4" />,
      },
      summaryItems: [
        { label: "Check new booking requests", icon: <Zap className="w-3.5 h-3.5" />, color: "text-orange-500" },
        { label: "Manage your live status", icon: <Radio className="w-3.5 h-3.5" />, color: "text-green-600" },
        { label: "Review upcoming gigs", icon: <Calendar className="w-3.5 h-3.5" />, color: "text-blue-500" },
      ],
      sections: [
        {
          title: "Operations",
          items: [
            { label: "Vendor Dashboard", href: "/vendor", icon: <LayoutDashboard className="w-4 h-4" /> },
            { label: "My Business", href: "/vendor/truck", icon: <Truck className="w-4 h-4" /> },
            { label: "Availability & Schedule", href: "/vendor/schedule", icon: <CalendarRange className="w-4 h-4" /> },
          ],
        },
        {
          title: "Marketplace",
          items: [
            { label: "Find Gigs", href: "/vendor/event-spots", icon: <Briefcase className="w-4 h-4" /> },
            { label: "Truck Parks", href: "/parks", icon: <Building2 className="w-4 h-4" /> },
            { label: "Events", href: "/events", icon: <Calendar className="w-4 h-4" /> },
          ],
        },
        {
          title: "Growth",
          items: [
            { label: "Marketing Studio", href: "/vendor/marketing", icon: <TrendingUp className="w-4 h-4" /> },
            { label: "Analytics", href: "/vendor/analytics", icon: <BarChart2 className="w-4 h-4" /> },
          ],
        },
        {
          title: "Account",
          items: [
            {
              label: "Messages",
              href: "/vendor/inbox",
              icon: <Inbox className="w-4 h-4" />,
              ...(unreadCount > 0 ? { badge: unreadCount, badgeColor: "red" as BadgeColor } : {}),
            },
            { label: "My Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
            { label: "Plans & Billing", href: "/pricing", icon: <CreditCard className="w-4 h-4" /> },
          ],
        },
      ],
    },

    // ── Organizer ─────────────────────────────────────────────────────────────
    organizer: {
      primaryCta: {
        label: "Create Event",
        href: "/organizer/events/new",
        icon: <Plus className="w-4 h-4" />,
      },
      summaryItems: [
        { label: "Review active events & lineups", icon: <Calendar className="w-3.5 h-3.5" />, color: "text-primary" },
        { label: "Fill open vendor spots", icon: <Zap className="w-3.5 h-3.5" />, color: "text-orange-500" },
        { label: "Check incoming vendor messages", icon: <Inbox className="w-3.5 h-3.5" />, color: "text-blue-500" },
      ],
      sections: [
        {
          title: "Events",
          items: [
            { label: "Event Dashboard", href: "/organizer", icon: <LayoutDashboard className="w-4 h-4" /> },
            { label: "Manage Events", href: "/organizer", icon: <Calendar className="w-4 h-4" /> },
            { label: "Create Event", href: "/organizer/events/new", icon: <Plus className="w-4 h-4" /> },
          ],
        },
        {
          title: "Discover",
          items: [
            { label: "Find Vendors", href: "/trucks", icon: <Search className="w-4 h-4" /> },
            { label: "Truck Parks", href: "/parks", icon: <Building2 className="w-4 h-4" /> },
            { label: "All Events", href: "/events", icon: <Star className="w-4 h-4" /> },
          ],
        },
        {
          title: "Account",
          items: [
            {
              label: "Messages",
              href: "/vendor/inbox",
              icon: <Inbox className="w-4 h-4" />,
              ...(unreadCount > 0 ? { badge: unreadCount, badgeColor: "red" as BadgeColor } : {}),
            },
            { label: "My Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
            { label: "Plans & Billing", href: "/pricing", icon: <CreditCard className="w-4 h-4" /> },
          ],
        },
      ],
    },

    // ── Park Host ─────────────────────────────────────────────────────────────
    park_host: {
      primaryCta: {
        label: "Manage My Park",
        href: "/park-host",
        icon: <Building2 className="w-4 h-4" />,
      },
      summaryItems: [
        { label: "Check spot availability & fills", icon: <MapPin className="w-3.5 h-3.5" />, color: "text-primary" },
        { label: "Review vendor requests", icon: <Zap className="w-3.5 h-3.5" />, color: "text-orange-500" },
        { label: "Track park performance", icon: <BarChart2 className="w-3.5 h-3.5" />, color: "text-green-600" },
      ],
      sections: [
        {
          title: "My Park",
          items: [
            { label: "Park Dashboard", href: "/park-host", icon: <LayoutDashboard className="w-4 h-4" /> },
            { label: "Manage Vendors", href: "/park-host", icon: <Truck className="w-4 h-4" /> },
            { label: "Spot Availability", href: "/park-host", icon: <CalendarRange className="w-4 h-4" /> },
            { label: "Park Performance", href: "/park-host/analytics", icon: <BarChart2 className="w-4 h-4" /> },
          ],
        },
        {
          title: "Explore",
          items: [
            { label: "Find Vendors", href: "/trucks", icon: <Search className="w-4 h-4" /> },
            { label: "Nearby Events", href: "/events", icon: <Calendar className="w-4 h-4" /> },
          ],
        },
        {
          title: "Account",
          items: [
            {
              label: "Messages",
              href: "/vendor/inbox",
              icon: <Inbox className="w-4 h-4" />,
              ...(unreadCount > 0 ? { badge: unreadCount, badgeColor: "red" as BadgeColor } : {}),
            },
            { label: "My Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
          ],
        },
      ],
    },

    // ── Admin ─────────────────────────────────────────────────────────────────
    admin: {
      sections: [
        {
          title: "Administration",
          items: [
            { label: "Admin Panel", href: "/admin", icon: <ShieldCheck className="w-4 h-4" /> },
            { label: "Manage Users", href: "/admin", icon: <User className="w-4 h-4" /> },
            { label: "Plans & Pricing", href: "/admin/plans", icon: <CreditCard className="w-4 h-4" /> },
          ],
        },
        {
          title: "Explore",
          items: [
            { label: "Browse Trucks", href: "/trucks", icon: <Truck className="w-4 h-4" /> },
            { label: "Events", href: "/events", icon: <Calendar className="w-4 h-4" /> },
            { label: "Truck Parks", href: "/parks", icon: <Building2 className="w-4 h-4" /> },
          ],
        },
        {
          title: "Account",
          items: [
            { label: "My Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
          ],
        },
      ],
    },

    // ── SuperAdmin ────────────────────────────────────────────────────────────
    superadmin: {
      summaryItems: [
        { label: "Full platform access enabled", icon: <Crown className="w-3.5 h-3.5" />, color: "text-purple-600" },
      ],
      sections: [
        {
          title: "SuperAdmin",
          items: [
            { label: "SuperAdmin Console", href: "/superadmin", icon: <Crown className="w-4 h-4" /> },
            { label: "Admin Panel", href: "/admin", icon: <ShieldCheck className="w-4 h-4" /> },
            { label: "Platform Settings", href: "/admin", icon: <Settings className="w-4 h-4" /> },
          ],
        },
        {
          title: "Explore",
          items: [
            { label: "Browse Trucks", href: "/trucks", icon: <Truck className="w-4 h-4" /> },
            { label: "Events", href: "/events", icon: <Calendar className="w-4 h-4" /> },
            { label: "Truck Parks", href: "/parks", icon: <Building2 className="w-4 h-4" /> },
          ],
        },
        {
          title: "Account",
          items: [
            { label: "My Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
          ],
        },
      ],
    },
  };

  return configs[role] ?? configs["customer"];
}

// ─── Role label helpers ───────────────────────────────────────────────────────

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    customer: "Food Lover",
    vendor: "Food Truck Vendor",
    organizer: "Event Organizer",
    park_host: "Park Host",
    admin: "Administrator",
    superadmin: "SuperAdmin",
  };
  return labels[role] ?? role;
}

function getRoleAccentClass(role: string): string {
  const accents: Record<string, string> = {
    customer: "from-primary/15 to-secondary/10 border-primary/20",
    vendor: "from-orange-500/15 to-orange-300/10 border-orange-300/30",
    organizer: "from-blue-500/15 to-blue-300/10 border-blue-300/30",
    park_host: "from-green-500/15 to-green-300/10 border-green-300/30",
    admin: "from-slate-500/15 to-slate-300/10 border-slate-300/30",
    superadmin: "from-purple-500/15 to-purple-300/10 border-purple-300/30",
  };
  return accents[role] ?? accents["customer"];
}

function getRoleIconBg(role: string): string {
  const bgs: Record<string, string> = {
    customer: "bg-primary/10",
    vendor: "bg-orange-100",
    organizer: "bg-blue-100",
    park_host: "bg-green-100",
    admin: "bg-slate-100",
    superadmin: "bg-purple-100",
  };
  return bgs[role] ?? bgs["customer"];
}

function getRoleIconColor(role: string): string {
  const colors: Record<string, string> = {
    customer: "text-primary",
    vendor: "text-orange-600",
    organizer: "text-blue-600",
    park_host: "text-green-600",
    admin: "text-slate-600",
    superadmin: "text-purple-600",
  };
  return colors[role] ?? colors["customer"];
}

// ─── Badge Component ──────────────────────────────────────────────────────────

function Badge({ value, color = "red" }: { value: string | number; color?: BadgeColor }) {
  const colorClasses: Record<BadgeColor, string> = {
    red: "bg-red-500 text-white",
    green: "bg-green-500 text-white",
    orange: "bg-orange-500 text-white",
    blue: "bg-blue-500 text-white",
  };
  return (
    <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${colorClasses[color]}`}>
      {typeof value === "number" && value > 99 ? "99+" : value}
    </span>
  );
}

// ─── ImpersonationBanner ──────────────────────────────────────────────────────

function ImpersonationBanner() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const raw = localStorage.getItem("impersonated_user");
  const impersonationActive = !!localStorage.getItem("token_original");
  if (!impersonationActive) return null;

  const info = raw ? JSON.parse(raw) : null;
  const displayName = user?.name || info?.name || "Unknown User";
  const displayRole = user?.role || info?.role || "unknown";
  const superAdminName = info?.superAdminName || "SuperAdmin";

  const exitImpersonation = () => {
    const original = localStorage.getItem("token_original");
    if (original) {
      localStorage.setItem("token", original);
      localStorage.removeItem("token_original");
      localStorage.removeItem("impersonated_user");
      queryClient.clear();
      window.location.href = "/superadmin";
    }
  };

  return (
    <div className="w-full bg-purple-700 text-white px-4 py-2.5 flex items-center justify-between gap-4 z-[100] relative">
      <div className="flex items-center gap-2.5 text-sm">
        <AlertTriangle className="w-4 h-4 text-purple-200 shrink-0" />
        <span className="font-medium">
          <span className="text-purple-200">{superAdminName} is viewing as</span>{" "}
          <span className="font-bold">{displayName}</span>{" "}
          <span className="text-purple-200">— Role:</span>{" "}
          <span className="font-bold capitalize">{displayRole}</span>
        </span>
      </div>
      <button
        onClick={exitImpersonation}
        className="shrink-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors border border-white/20"
      >
        Exit Impersonation
      </button>
    </div>
  );
}

// ─── Mobile Slide-Out Drawer ──────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  user,
  isAuthenticated,
  logout,
  location,
  unreadCount,
}: {
  open: boolean;
  onClose: () => void;
  user: any;
  isAuthenticated: boolean;
  logout: () => void;
  location: string;
  unreadCount: number;
}) {
  const role = user?.role ?? "guest";
  const config = isAuthenticated ? getRoleConfig(role, { unreadCount }) : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-[300px] max-w-[88vw] z-50 md:hidden flex flex-col bg-card border-l border-border shadow-2xl overflow-hidden"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                </div>
                <span className="font-display font-bold text-base text-foreground">RoamBites</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">

              {isAuthenticated && user ? (
                <>
                  {/* Identity block */}
                  <div className={`mx-4 mt-4 p-4 rounded-2xl border bg-gradient-to-br ${getRoleAccentClass(role)}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getRoleIconBg(role)}`}>
                        {role === "superadmin" ? (
                          <Crown className={`w-5 h-5 ${getRoleIconColor(role)}`} />
                        ) : role === "admin" ? (
                          <ShieldCheck className={`w-5 h-5 ${getRoleIconColor(role)}`} />
                        ) : (
                          <User className={`w-5 h-5 ${getRoleIconColor(role)}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-tight truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{getRoleLabel(role)}</p>
                      </div>
                    </div>

                    {/* Summary block */}
                    {config?.summaryItems && config.summaryItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                        {config.summaryItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className={item.color ?? "text-muted-foreground"}>{item.icon}</span>
                            <span className="text-xs text-muted-foreground leading-snug">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Primary CTA */}
                  {config?.primaryCta && (
                    <div className="px-4 mt-4">
                      <Link href={config.primaryCta.href} onClick={onClose}>
                        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-90 transition-opacity">
                          {config.primaryCta.icon}
                          {config.primaryCta.label}
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* Sections */}
                  {config?.sections.map((section) => (
                    <div key={section.title} className="mt-5 px-4">
                      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1.5 px-2">
                        {section.title}
                      </p>
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const isActive = location === item.href;
                          return (
                            <Link
                              key={item.href + item.label}
                              href={item.href}
                              onClick={onClose}
                            >
                              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-muted"
                              }`}>
                                <span className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                                  {item.icon}
                                </span>
                                <span className="text-sm font-medium flex-1">{item.label}</span>
                                {item.badge !== undefined ? (
                                  <Badge value={item.badge} color={item.badgeColor} />
                                ) : (
                                  isActive && <ChevronRight className="w-3.5 h-3.5 text-primary/60 ml-auto" />
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Log out */}
                  <div className="px-4 mt-5 pb-4">
                    <button
                      onClick={() => { logout(); onClose(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                /* Guest menu */
                <div className="p-4 space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3 px-2">
                    Explore
                  </p>
                  {[
                    { label: "Live Map", href: "/trucks?view=map", icon: <Map className="w-4 h-4" />, highlight: true },
                    { label: "Find Food", href: "/trucks", icon: <Search className="w-4 h-4" /> },
                    { label: "Events Near Me", href: "/events", icon: <Calendar className="w-4 h-4" /> },
                    { label: "Food Truck Parks", href: "/parks", icon: <Building2 className="w-4 h-4" /> },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} onClick={onClose}>
                      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        (item as any).highlight
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 font-semibold"
                          : location === item.href ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                      }`}>
                        <span className={(item as any).highlight ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>{item.icon}</span>
                        <span className="text-sm font-medium">{item.label}</span>
                        {(item as any).highlight && (
                          <span className="ml-auto relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}

                  <div className="pt-5 space-y-2">
                    <Link href="/login" onClick={onClose}>
                      <div className="w-full py-3 text-center rounded-xl border border-border font-semibold text-sm text-foreground hover:bg-muted transition-colors">
                        Log in
                      </div>
                    </Link>
                    <Link href="/signup" onClick={onClose}>
                      <div className="w-full py-3 text-center rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20">
                        Sign up free
                      </div>
                    </Link>
                  </div>

                  <div className="pt-4 border-t border-border mt-4 space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 px-2">Are you a business?</p>
                    <Link href="/signup?role=vendor" onClick={onClose}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">List Your Food Truck</span>
                      </div>
                    </Link>
                    <Link href="/signup?role=organizer" onClick={onClose}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors">
                        <Star className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Host an Event</span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadCount = useUnreadCount(isAuthenticated);
  const inboxHref = "/vendor/inbox";

  // Close mobile drawer on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Desktop nav links — kept minimal; slide-out handles the rest
  const desktopNavLinks = (() => {
    if (!user) {
      return [
        { name: "Live Map", path: "/trucks?view=map" },
        { name: "Browse Trucks", path: "/trucks" },
        { name: "Events", path: "/events" },
      ];
    }
    if (user.role === "customer") {
      return [
        { name: "Live Map", path: "/trucks?view=map" },
        { name: "Find Food", path: "/trucks" },
        { name: "Events", path: "/events" },
      ];
    }
    if (user.role === "vendor") {
      return [
        { name: "Schedule", path: "/vendor/schedule" },
        { name: "Find Gigs", path: "/vendor/event-spots" },
        { name: "Truck Parks", path: "/parks" },
      ];
    }
    if (user.role === "organizer") {
      return [
        { name: "My Events", path: "/organizer" },
        { name: "Create Event", path: "/organizer/events/new" },
        { name: "Find Vendors", path: "/trucks" },
      ];
    }
    if (user.role === "park_host") {
      return [
        { name: "My Park", path: "/park-host" },
        { name: "Find Vendors", path: "/trucks" },
        { name: "Events", path: "/events" },
      ];
    }
    if (user.role === "admin" || user.role === "superadmin") {
      return [
        { name: "Admin", path: "/admin" },
        ...(user.role === "superadmin" ? [{ name: "SuperAdmin", path: "/superadmin" }] : []),
      ];
    }
    return [{ name: "Browse Trucks", path: "/trucks" }];
  })();

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === "superadmin") return { href: "/superadmin", label: "SuperAdmin Console" };
    if (user.role === "vendor") return { href: "/vendor", label: "Vendor Dashboard" };
    if (user.role === "organizer") return { href: "/organizer", label: "Organizer Dashboard" };
    if (user.role === "admin") return { href: "/admin", label: "Admin Panel" };
    if (user.role === "park_host") return { href: "/park-host", label: "Park Dashboard" };
    return null;
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ImpersonationBanner />

      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                RoamBites
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {desktopNavLinks.map((link) => {
                const isLiveMap = link.path.includes("?view=map");
                const linkBase = link.path.split("?")[0];
                const isActive = isLiveMap
                  ? location === "/trucks" && new URLSearchParams(window.location.search).get("view") === "map"
                  : location === linkBase;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {isLiveMap && <Map className="w-3.5 h-3.5" />}
                    {link.name}
                    {isLiveMap && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-2" ref={profileRef}>
                  {/* Inbox */}
                  <Link
                    href={inboxHref}
                    className="relative p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    title="Messages"
                  >
                    <Inbox className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted text-sm font-medium transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRoleIconBg(user?.role ?? "customer")}`}>
                        {user?.role === "superadmin" ? (
                          <Crown className={`w-4 h-4 ${getRoleIconColor("superadmin")}`} />
                        ) : user?.role === "admin" ? (
                          <ShieldCheck className={`w-4 h-4 ${getRoleIconColor("admin")}`} />
                        ) : (
                          <User className={`w-4 h-4 ${getRoleIconColor(user?.role ?? "customer")}`} />
                        )}
                      </div>
                      <span className="text-foreground">{user?.name?.split(" ")[0]}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-60 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                        >
                          {/* Identity */}
                          <div className={`px-4 py-3.5 border-b border-border bg-gradient-to-br ${getRoleAccentClass(user?.role ?? "customer")}`}>
                            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role ?? "customer")}</p>
                          </div>

                          <div className="py-1.5">
                            {user?.role === "vendor" && (
                              <Link href="/vendor/truck" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                                <Truck className="w-4 h-4 text-muted-foreground" />
                                My Truck
                              </Link>
                            )}
                            <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                              <User className="w-4 h-4 text-muted-foreground" />
                              My Profile
                            </Link>
                            {user?.role === "customer" && (
                              <Link href="/favorites" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                                <Heart className="w-4 h-4 text-muted-foreground" />
                                Saved Trucks
                              </Link>
                            )}
                            {dashboardLink && (
                              <Link
                                href={dashboardLink.href}
                                onClick={() => setProfileOpen(false)}
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${user?.role === "superadmin" ? "text-purple-700 hover:bg-purple-50" : "text-foreground hover:bg-muted"}`}
                              >
                                <LayoutDashboard className={`w-4 h-4 ${user?.role === "superadmin" ? "text-purple-500" : "text-muted-foreground"}`} />
                                {dashboardLink.label}
                              </Link>
                            )}
                            {(user?.role === "vendor" || user?.role === "organizer") && (
                              <Link href="/pricing" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                Plans & Billing
                              </Link>
                            )}
                            {user?.role === "superadmin" && (
                              <Link href="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                                Admin Panel
                              </Link>
                            )}
                            <div className="border-t border-border mt-1 pt-1">
                              <button
                                onClick={() => { logout(); setProfileOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <LogOut className="w-4 h-4" />
                                Log out
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: Inbox + Hamburger */}
            <div className="md:hidden flex items-center gap-1">
              {isAuthenticated && (
                <Link
                  href={inboxHref}
                  className="relative p-2 rounded-full hover:bg-muted text-foreground transition-colors"
                  title="Messages"
                >
                  <Inbox className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                className="p-2 rounded-full hover:bg-muted text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        logout={logout}
        location={location}
        unreadCount={unreadCount}
      />

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-card border-t border-border py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white opacity-70">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-bold text-foreground mb-1">RoamBites</p>
          <p className="text-sm">Find your flavor, wherever you roam.</p>
          <p className="text-xs mt-8 opacity-50">&copy; {new Date().getFullYear()} RoamBites. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
