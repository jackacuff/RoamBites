import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { getApiUrl } from "@/lib/api";
import { UtensilsCrossed, AlertCircle, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-background">
          <div className="max-w-md w-full bg-card rounded-3xl border border-border shadow-2xl shadow-primary/10 p-10 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid link</h2>
            <p className="text-muted-foreground text-sm mb-6">This password reset link is missing or invalid. Please request a new one.</p>
            <Link href="/forgot-password" className="text-primary font-semibold hover:underline text-sm">Request new link</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border p-8 md:p-10">

            {done ? (
              <div className="text-center py-4">
                <div className="mx-auto w-16 h-16 bg-accent/15 text-accent rounded-full flex items-center justify-center mb-5">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-3">Password reset!</h2>
                <p className="text-muted-foreground text-sm mb-6">Your password has been changed. You can now sign in with your new password.</p>
                <button
                  onClick={() => setLocation("/login")}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-md"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-foreground">New password</h2>
                  <p className="mt-2 text-muted-foreground text-sm">Choose a strong password for your account.</p>
                </div>

                {error && (
                  <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start text-destructive">
                    <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">New password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-11 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="At least 6 characters"
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Confirm new password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Repeat your password"
                      />
                    </div>
                    {confirm && password !== confirm && (
                      <p className="mt-1 text-xs text-destructive">Passwords don't match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3.5 px-4 mt-2 rounded-xl shadow-md text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
                  >
                    {loading ? "Saving…" : "Set new password"}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Request a new reset link
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
