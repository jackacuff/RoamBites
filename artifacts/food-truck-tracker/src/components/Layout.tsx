import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UtensilsCrossed, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Browse Trucks", path: "/trucks" },
    { name: "Events", path: "/events" },
  ];

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'vendor') return "/vendor";
    if (user.role === 'organizer') return "/organizer";
    if (user.role === 'admin') return "/admin";
    return null;
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                OK Food Trucks
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  href={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${location === link.path ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Auth Actions */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  {dashboardLink && (
                    <Link 
                      href={dashboardLink}
                      className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  <button 
                    onClick={() => logout()}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    title="Log out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
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
                  className={`block px-3 py-3 rounded-xl text-base font-medium ${location === link.path ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="border-t border-border my-2 pt-2">
                {isAuthenticated ? (
                  <>
                    {dashboardLink && (
                      <Link 
                        href={dashboardLink}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-3 rounded-xl text-base font-medium text-primary hover:bg-primary/10"
                      >
                        Dashboard
                      </Link>
                    )}
                    <button 
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="w-full text-left px-3 py-3 rounded-xl text-base font-medium text-muted-foreground hover:bg-muted"
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
          <div className="flex justify-center items-center gap-2 mb-4 opacity-50">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <p className="font-display font-medium text-foreground mb-2">Central Oklahoma Food Truck Tracker</p>
          <p className="text-sm">Find your flavor across the Sooner State.</p>
          <p className="text-xs mt-8 opacity-50">&copy; {new Date().getFullYear()} OK Food Trucks. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
