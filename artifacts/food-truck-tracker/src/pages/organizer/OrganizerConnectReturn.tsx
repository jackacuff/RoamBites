import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useLocation } from "wouter";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function OrganizerConnectReturn() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "complete" | "incomplete">("loading");

  useEffect(() => {
    fetch(getApiUrl("/api/organizer/connect/status"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setStatus(data.onboardingComplete ? "complete" : "incomplete");
        setTimeout(() => setLocation("/organizer"), 3000);
      })
      .catch(() => {
        setStatus("incomplete");
        setTimeout(() => setLocation("/organizer"), 3000);
      });
  }, []);

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifying your Stripe account…</h1>
            <p className="text-muted-foreground">Just a moment while we confirm everything is set up.</p>
          </>
        )}
        {status === "complete" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Stripe connected!</h1>
            <p className="text-muted-foreground mb-4">
              You can now collect spot fees from vendors. You'll receive 90% of each payment directly to your Stripe account.
            </p>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
          </>
        )}
        {status === "incomplete" && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Setup not complete</h1>
            <p className="text-muted-foreground mb-4">
              Your Stripe account setup isn't finished yet. You can complete it from your dashboard.
            </p>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
          </>
        )}
      </div>
    </Layout>
  );
}
