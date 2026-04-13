import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { getApiUrl } from "@/lib/api";
import { CheckCircle, XCircle, Loader2, UtensilsCrossed } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function VerifyEmail() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }
    fetch(getApiUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`))
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message ?? "Email verified successfully!");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [token]);

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border p-10 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
              <UtensilsCrossed className="w-6 h-6" />
            </div>

            {status === "loading" && (
              <>
                <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-bold text-foreground mb-2">Verifying your email…</h2>
                <p className="text-muted-foreground text-sm">Just a moment.</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto w-16 h-16 bg-accent/15 text-accent rounded-full flex items-center justify-center mb-5">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-3">Email verified!</h2>
                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{message}</p>
                <Link
                  href="/"
                  className="inline-block w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-md text-center"
                >
                  Continue to RoamBites
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-5">
                  <XCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-3">Verification failed</h2>
                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{message}</p>
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="block w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-md text-center"
                  >
                    Sign in to resend
                  </Link>
                  <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Back to home
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
