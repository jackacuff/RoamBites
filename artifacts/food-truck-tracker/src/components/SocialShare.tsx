import { useState } from "react";
import { Share2, X, Copy, Check, ExternalLink } from "lucide-react";

interface ShareOptions {
  url?: string;
  title: string;
  text: string;
}

interface SocialShareProps {
  options: ShareOptions;
  trigger?: React.ReactNode;
  className?: string;
}

const PLATFORMS = [
  {
    id: "twitter",
    label: "X (Twitter)",
    color: "bg-black text-white hover:bg-zinc-800",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    buildUrl: ({ url, text }: ShareOptions) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ""}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    color: "bg-[#1877F2] text-white hover:bg-[#166FE5]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    buildUrl: ({ url }: ShareOptions) =>
      url ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` : null,
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:opacity-90",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    buildUrl: () => null,
    note: "Copy text & paste to Instagram",
  },
  {
    id: "tiktok",
    label: "TikTok",
    color: "bg-black text-white hover:bg-zinc-800",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.67a8.28 8.28 0 004.84 1.55V6.78a4.85 4.85 0 01-1.07-.09z" />
      </svg>
    ),
    buildUrl: () => null,
    note: "Copy text & post on TikTok",
  },
];

export function SocialShareButton({ options, className = "" }: SocialShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = options.url || window.location.href;
  const shareText = `${options.text}${shareUrl ? `\n${shareUrl}` : ""}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: options.title, text: options.text, url: shareUrl });
        return;
      } catch {
        /* fall through to modal */
      }
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleNativeShare}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`}
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-foreground mb-4">Share</h3>

            <div className="space-y-2 mb-4">
              {PLATFORMS.map(p => {
                const href = p.buildUrl(options);
                const content = (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.color.replace("hover:", "")}`}>
                      {p.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium text-foreground">{p.label}</span>
                      {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                );

                if (href) {
                  return (
                    <a
                      key={p.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted transition-colors"
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <button
                    key={p.id}
                    onClick={() => { handleCopy(); }}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted transition-colors"
                  >
                    {content}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2">Copy link</p>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground truncate">{shareUrl}</div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function buildLiveShareText(truckName: string, location?: string | null, truckUrl?: string) {
  const loc = location ? ` at ${location}` : "";
  return `🚚 ${truckName} is LIVE${loc}! Come get some amazing food. #FoodTruck #RoamBites`;
}

export function buildScheduleShareText(truckName: string, entries: { venueName?: string; city?: string; startDateTime?: string }[]) {
  if (entries.length === 0) return `Check out ${truckName}'s schedule on RoamBites! #FoodTruck`;
  const next = entries[0];
  const where = [next.venueName, next.city].filter(Boolean).join(", ");
  const when = next.startDateTime ? new Date(next.startDateTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
  return `📅 Catch ${truckName}${where ? ` at ${where}` : ""}${when ? ` on ${when}` : ""}! #FoodTruck #RoamBites`;
}
