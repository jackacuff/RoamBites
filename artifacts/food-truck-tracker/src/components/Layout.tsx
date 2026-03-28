import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UtensilsCrossed, Menu, X, LogOut, User, Heart, ChevronDown, Crown, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

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

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Browse Trucks", path: "/trucks" },
    { name: "Events", path: "/events" },
    ...(user?.role === "vendor" ? [{ name: "My Truck", path: "/vendor/truck" }] : []),
    ...(user?.role === "organizer" ? [{ name: "My Events", path: "/organizer" }] : []),
  ];

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === "superadmin") return { href: "/superadmin", label: "SuperAdmin Console" };
    if (user.role === "vendor") return { href: "/vendor", label: "Vendor Dashboard" };
    if (user.role === "organizer") return { href: "/organizer", label: "Organizer Dashboard" };
    if (user.role === "admin") return { href: "/admin", label: "Admin Panel" };
    return null;
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ImpersonationBanner />
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                RoamBites
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${location === link.path ? "text-primary" : "text-muted-foreground"}`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Auth Actions */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3" ref={profileRef}>
                  {user?.role === "customer" && (
                    <Link
                      href="/favorites"
                      className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                      title="My Favorites"
                    >
                      <Heart className="w-5 h-5" />
                    </Link>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted text-sm font-medium transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user?.role === "superadmin" ? "bg-purple-100" : "bg-primary/10"}`}>
                        {user?.role === "superadmin" ? (
                          <Crown className="w-4 h-4 text-purple-600" />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <span className="text-foreground">{user?.name?.split(" ")[0]}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                        >
                          <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                          </div>
                          <div className="py-1">
                            <Link
                              href="/profile"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <User className="w-4 h-4 text-muted-foreground" />
                              My Profile
                            </Link>
                            {user?.role === "customer" && (
                              <Link
                                href="/favorites"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Heart className="w-4 h-4 text-muted-foreground" />
                                My Favorites
                              </Link>
                            )}
                            {dashboardLink && (
                              <Link
                                href={dashboardLink.href}
                                onClick={() => setProfileOpen(false)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${user?.role === "superadmin" ? "text-purple-700 hover:bg-purple-50" : "text-foreground hover:bg-muted"}`}
                              >
                                {user?.role === "superadmin" ? (
                                  <Crown className="w-4 h-4 text-purple-500" />
                                ) : (
                                  <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                                )}
                                {dashboardLink.label}
                              </Link>
                            )}
                            <button
                              onClick={() => { logout(); setProfileOpen(false); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              Log out
                            </button>
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

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-card"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-xl text-base font-medium ${location === link.path ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="border-t border-border my-2 pt-2">
                {isAuthenticated ? (
                  <>
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-muted"
                    >
                      My Profile
                    </Link>
                    {user?.role === "customer" && (
                      <Link
                        href="/favorites"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-muted"
                      >
                        My Favorites
                      </Link>
                    )}
                    {dashboardLink && (
                      <Link
                        href={dashboardLink.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-3 py-3 rounded-xl text-base font-medium hover:bg-primary/10 ${user?.role === "superadmin" ? "text-purple-700" : "text-primary"}`}
                      >
                        {dashboardLink.label}
                      </Link>
                    )}
                    <button
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="w-full text-left px-3 py-3 rounded-xl text-base font-medium text-destructive hover:bg-destructive/5"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 mt-4 px-3">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center rounded-xl border border-border font-medium">
                      Log in
                    </Link>
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center rounded-xl bg-primary text-primary-foreground font-semibold">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
