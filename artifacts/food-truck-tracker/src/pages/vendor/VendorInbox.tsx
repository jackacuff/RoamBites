import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Mail, Inbox, CheckCheck, CalendarCheck, MessageSquare, ArrowLeft, Check, MapPin } from "lucide-react";
import { Link } from "wouter";

interface Message {
  id: number;
  fromUserId: number;
  toUserId: number;
  subject: string | null;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  fromUser: { id: number; name: string; email: string; role: string } | null;
  truck: { id: number; name: string } | null;
  event: { id: number; name: string } | null;
  spotApplication: { id: number; status: string; listingId: number; listingTitle: string | null } | null;
}

const TYPE_STYLES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  invitation: { label: "Event Invitation", icon: <CalendarCheck className="w-4 h-4" />, color: "bg-blue-100 text-blue-700" },
  message: { label: "Message", icon: <MessageSquare className="w-4 h-4" />, color: "bg-muted text-muted-foreground" },
  notification: { label: "Notification", icon: <Mail className="w-4 h-4" />, color: "bg-purple-100 text-purple-700" },
  spot_request: { label: "Spot Request", icon: <MapPin className="w-4 h-4" />, color: "bg-orange-100 text-orange-700" },
};

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function VendorInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);

  const inbox = messages.filter(m => m.toUserId === user?.id);
  const sent = messages.filter(m => m.fromUserId === user?.id && m.toUserId !== user?.id);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [filter, setFilter] = useState<"all" | "unread" | "invitations">("all");

  const load = () => {
    setLoading(true);
    fetch(getApiUrl("/api/messages"), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setMessages(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user) load(); }, [user]);

  const markRead = async (msg: Message) => {
    if (!msg.isRead && msg.toUserId === user?.id) {
      await fetch(getApiUrl(`/api/messages/${msg.id}/read`), { method: "PUT", headers: authHeaders() });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    }
    setSelected(msg);
  };

  const markAllRead = async () => {
    await fetch(getApiUrl("/api/messages/read-all"), { method: "PUT", headers: authHeaders() });
    setMessages(prev => prev.map(m => m.toUserId === user?.id ? { ...m, isRead: true } : m));
    toast({ title: "All messages marked as read" });
  };

  const displayed = tab === "inbox" ? inbox : sent;
  const filtered = displayed.filter(m => {
    if (filter === "unread") return !m.isRead;
    if (filter === "invitations") return m.type === "invitation";
    return true;
  });

  const unreadCount = inbox.filter(m => !m.isRead).length;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/vendor" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Inbox className="w-6 h-6 text-primary" />
                Inbox
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{unreadCount}</span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Messages and event invitations from organizers</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted">
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message list */}
          <div className="lg:col-span-1">
            <div className="flex gap-1 mb-4">
              {[{ id: "inbox", label: `Inbox ${inbox.length > 0 ? `(${inbox.length})` : ""}` }, { id: "sent", label: "Sent" }].map(t => (
                <button key={t.id} onClick={() => { setTab(t.id as any); setSelected(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "inbox" && (
              <div className="flex gap-1 mb-3">
                {[
                  { id: "all", label: "All" },
                  { id: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
                  { id: "invitations", label: "Invitations" },
                ].map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filter === f.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Mail className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map(msg => {
                  const typeMeta = TYPE_STYLES[msg.type] ?? TYPE_STYLES.message;
                  const isSelected = selected?.id === msg.id;
                  const isIncoming = msg.toUserId === user?.id;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => markRead(msg)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"} ${!msg.isRead && isIncoming ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">
                          {!msg.isRead && isIncoming ? (
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          ) : (
                            <div className="w-2 h-2 mt-1.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${typeMeta.color}`}>
                              {typeMeta.icon} {typeMeta.label}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${!msg.isRead && isIncoming ? "font-semibold text-foreground" : "text-foreground"}`}>
                            {msg.subject || (msg.event?.name ? `Re: ${msg.event.name}` : "Message")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isIncoming ? msg.fromUser?.name || "Unknown" : `To: ${msg.toUserId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{format(new Date(msg.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message detail */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-muted/30 border border-dashed border-border rounded-2xl flex items-center justify-center h-80">
                <div className="text-center text-muted-foreground">
                  <Inbox className="w-10 h-10 mx-auto opacity-30 mb-3" />
                  <p className="font-medium">Select a message to read</p>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    {selected.subject && <h2 className="text-lg font-bold text-foreground mb-1">{selected.subject}</h2>}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>From: <span className="font-medium text-foreground">{selected.fromUser?.name || "Unknown"}</span></span>
                      <span>{format(new Date(selected.createdAt), "MMMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                  </div>
                  {(() => {
                    const typeMeta = TYPE_STYLES[selected.type] ?? TYPE_STYLES.message;
                    return (
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${typeMeta.color} shrink-0`}>
                        {typeMeta.icon} {typeMeta.label}
                      </span>
                    );
                  })()}
                </div>

                {(selected.event || selected.truck || selected.spotApplication) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selected.spotApplication && (
                      <Link href={`/spots/${selected.spotApplication.listingId}`}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors cursor-pointer border border-orange-200">
                          <MapPin className="w-3.5 h-3.5" />
                          {selected.spotApplication.listingTitle ?? "Spot Listing"}
                        </span>
                      </Link>
                    )}
                    {selected.spotApplication && (
                      <Link href="/my-spots">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors cursor-pointer">
                          View my requests
                        </span>
                      </Link>
                    )}
                    {selected.event && (
                      <Link href={`/events/${selected.event.id}`}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer">
                          <CalendarCheck className="w-3.5 h-3.5" />
                          {selected.event.name}
                        </span>
                      </Link>
                    )}
                    {selected.truck && (
                      <Link href={`/trucks/${selected.truck.id}`}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer">
                          {selected.truck.name}
                        </span>
                      </Link>
                    )}
                  </div>
                )}

                <div
                  className="text-foreground text-sm leading-relaxed prose-sm max-w-none bg-muted/30 rounded-xl p-4"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.body) }}
                />

                {selected.type === "invitation" && selected.event && selected.toUserId === user?.id && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-3">Respond to this invitation:</p>
                    <div className="flex gap-2">
                      <Link href="/vendor/events">
                        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
                          <Check className="w-4 h-4" />
                          View & Respond
                        </button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
