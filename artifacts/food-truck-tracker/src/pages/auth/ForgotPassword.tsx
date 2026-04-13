import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { getApiUrl } from "@/lib/api";
import { UtensilsCrossed, AlertCircle, Mail, CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong.");
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border p-8 md:p-10">

            {sent ? (
              <div className="text-center py-4">
                <div className="mx-auto w-16 h-16 bg-accent/15 text-accent rounded-full flex items-center justify-center mb-5">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-3">Check your inbox</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  If an account exists for <strong className="text-foreground">{email}</strong>, we've sent a password reset link. Check your spam folder if you don't see it within a minute.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-foreground">Forgot password?</h2>
                  <p className="mt-2 text-muted-foreground text-sm">Enter your email and we'll send you a reset link.</p>
                </div>

                {error && (
                  <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start text-destructive">
                    <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="you@example.com"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Sending…" : "Send reset link"}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
