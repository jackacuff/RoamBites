import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { UtensilsCrossed, AlertCircle, ChevronRight, Truck, Calendar, User, MapPin } from "lucide-react";

type Role = "customer" | "vendor" | "organizer" | "park_host";

interface RoleOption {
  id: Role;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  perks: string[];
  ctaText: string;
  colorClass: string;
}

const ROLES: RoleOption[] = [
  {
    id: "customer",
    icon: <User className="w-6 h-6" />,
    title: "Food Lover",
    subtitle: "Discover trucks, save favorites, find events",
    perks: ["Browse food trucks near you", "Save your favorites", "Get notified about events"],
    ctaText: "Join free",
    colorClass: "bg-blue-500",
  },
  {
    id: "vendor",
    icon: <Truck className="w-6 h-6" />,
    title: "Food Truck Owner",
    subtitle: "Get bookings, grow your audience, manage your truck",
    perks: ["Get discovered by thousands of hungry customers", "Book events and fill your calendar", "Share your schedule & specials in seconds"],
    ctaText: "Start free trial",
    colorClass: "bg-primary",
  },
  {
    id: "organizer",
    icon: <Calendar className="w-6 h-6" />,
    title: "Event Organizer",
    subtitle: "Create events, fill spots, pay vendors",
    perks: ["Access the food truck marketplace", "Collect spot fees via Stripe", "Manage invitations and applications"],
    ctaText: "Get started free",
    colorClass: "bg-secondary",
  },
  {
    id: "park_host",
    icon: <MapPin className="w-6 h-6" />,
    title: "Truck Park Host",
    subtitle: "List your lot, fill vacancies, attract trucks",
    perks: ["List your truck park location", "Manage vacancies and rates", "Connect with food truck vendors"],
    ctaText: "List your park",
    colorClass: "bg-green-600",
  },
];

const ROLE_CONTEXTS: Record<Role, { heading: string; subheading: string }> = {
  customer: {
    heading: "Welcome to RoamBites",
    subheading: "Find your next great meal on wheels.",
  },
  vendor: {
    heading: "Grow your food truck business",
    subheading: "Get discovered, book more events, and manage everything in one place. Free trial included.",
  },
  organizer: {
    heading: "Bring food trucks to your event",
    subheading: "Access the truck marketplace, collect spot fees, and manage your lineup — free to start.",
  },
  park_host: {
    heading: "Fill your truck park",
    subheading: "List vacancies, set your rates, and connect with food truck vendors.",
  },
};

export default function Signup() {
  const { signup, isSigningUp } = useAuth();
  const [step, setStep] = useState<"role" | "details">("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function selectRole(role: Role) {
    setSelectedRole(role);
    setErrors({});
    setServerError(null);
    setStep("details");
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Name must be at least 2 characters";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Please enter a valid email";
    if (!form.password || form.password.length < 6) errs.password = "Password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole || !validate()) return;
    setServerError(null);
    try {
      await signup({ data: { name: form.name.trim(), email: form.email.trim(), password: form.password, role: selectedRole } });
    } catch (err: any) {
      setServerError(err?.message || "Failed to create account. That email might already be in use.");
    }
  }

  const ctx = selectedRole ? ROLE_CONTEXTS[selectedRole] : null;
  const roleOption = ROLES.find(r => r.id === selectedRole);

  /* ── Step 1: Role selector ── */
  if (step === "role") {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-background">
          <div className="max-w-3xl w-full">
            <div className="text-center mb-10">
              <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Join RoamBites</h1>
              <p className="mt-2 text-muted-foreground">Tell us who you are to get the right experience</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  className="group text-left bg-card border border-border rounded-2xl p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${role.colorClass} text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      {role.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{role.title}</h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{role.subtitle}</p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-1.5">
                    {role.perks.map((perk, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div className={`mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-center text-white ${role.colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}>
                    {role.ctaText} →
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  /* ── Step 2: Account details ── */
  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-background">
        <div className="max-w-md w-full">
          <button
            onClick={() => { setStep("role"); setServerError(null); setErrors({}); }}
            className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>

          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border p-8">
            {roleOption && (
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                <div className={`w-10 h-10 rounded-xl ${roleOption.colorClass} text-white flex items-center justify-center shrink-0`}>
                  {roleOption.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{roleOption.title}</p>
                  <h2 className="font-bold text-foreground">{ctx?.heading}</h2>
                </div>
              </div>
            )}

            {ctx?.subheading && (
              <p className="text-muted-foreground text-sm mb-5">{ctx.subheading}</p>
            )}

            {selectedRole === "vendor" && (
              <div className="mb-5 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">What you'll do first</p>
                <ul className="space-y-1.5">
                  {["Create your truck profile and menu", "Set your weekly schedule", "Activate your free trial — no card needed yet"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedRole === "organizer" && (
              <div className="mb-5 p-4 bg-secondary/5 border border-secondary/20 rounded-2xl">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">What you'll do first</p>
                <ul className="space-y-1.5">
                  {["Create your first event and set the lineup", "Browse the truck marketplace to invite vendors", "Connect Stripe to collect spot fees automatically"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-4 h-4 rounded-full bg-secondary/20 text-secondary text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {serverError && (
              <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start text-destructive">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Jane Smith"
                  autoFocus
                />
                {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="At least 6 characters"
                />
                {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password}</p>}
              </div>

              {selectedRole === "vendor" && (
                <p className="text-xs text-muted-foreground text-center">
                  Plans start at $39/mo after your trial. Cancel anytime.
                </p>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 mt-2"
              >
                {isSigningUp ? "Creating your account…" : (roleOption?.ctaText ?? "Create account")}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
