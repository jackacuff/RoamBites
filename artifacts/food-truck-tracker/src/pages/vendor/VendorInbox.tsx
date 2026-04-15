import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useRef, useCallback } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail, Inbox, CalendarCheck, MessageSquare, ArrowLeft,
  MapPin, Send, CheckCircle2, XCircle, Clock, AlertCircle,
  ChevronRight, Loader2,
} from "lucide-react";
import { Link, useSearch } from "wouter";

// ── Types ───────────────────────────────────────────────────────────────────

interface ThreadSummary {
  key: string;
  applicationId: number | null;
  listingId: number | null;
  listingTitle: string | null;
  applicationStatus: string | null;
  otherUser: { id: number; name: string; email: string; role: string } | null;
  lastMessage: { body: string; createdAt: string; fromUserId: number };
  unreadCount: number;
  messageCount: number;
  type: string;
  eventId: number | null;
}

interface ThreadMessage {
  id: number;
  fromUserId: number;
  toUserId: number;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  fromUser: { id: number; name: string; role: string } | null;
  toUser: { id: number; name: string; role: string } | null;
}

interface ThreadDetail {
  application: {
    id: number;
    status: string;
    notes: string | null;
    hostMessage: string | null;
    vendorUserId: number;
    listingId: number;
    listingTitle: string | null;
    listingSpotType: string | null;
    hostUserId: number | null;
    createdAt: string;
    confirmedAt: string | null;
  };
  otherUser: { id: number; name: string; email: string; role: string } | null;
  currentUser: { id: number; name: string; email: string; role: string } | null;
  messages: ThreadMessage[];
}

interface FlatMessage {
  id: number;
  fromUserId: number;
  toUserId: number;
  subject: string | null;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  fromUser: { id: number; name: string; email: string; role: string } | null;
  event: { id: number; name: string } | null;
  truck: { id: number; name: string } | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  pending_host_approval: {
    label: "Pending Review",
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  declined: {
    label: "Declined",
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  waitlisted: {
    label: "Waitlisted",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

function isSystemMessage(msg: ThreadMessage) {
  return msg.type === "system" || msg.fromUserId === 0;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "xs" | "sm" | "md" }) {
  const sz = size === "xs" ? "w-6 h-6 text-[10px]" : size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0`}>
      {getInitials(name || "?")}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_host_approval;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function SystemChip({ body }: { body: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="px-3 py-1 rounded-full bg-muted border border-border text-[11px] text-muted-foreground">
        {body.replace(/\*\*/g, "")}
      </span>
    </div>
  );
}

function ChatBubble({
  message,
  isMe,
  showName,
}: {
  message: ThreadMessage;
  isMe: boolean;
  showName: boolean;
}) {
  if (isSystemMessage(message)) {
    return <SystemChip body={message.body} />;
  }

  const name = isMe ? "You" : (message.fromUser?.name || "Unknown");

  return (
    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {!isMe && (
        <Avatar name={message.fromUser?.name || "?"} size="xs" />
      )}
      <div className={`max-w-[78%] sm:max-w-[68%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
        {showName && (
          <span className={`text-[11px] font-semibold text-muted-foreground px-1`}>
            {name}
          </span>
        )}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            isMe
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.body) }}
        />
        <span className="text-[10px] text-muted-foreground px-1">
          {format(new Date(message.createdAt), "h:mm a")}
        </span>
      </div>
      {isMe && <div className="w-6 shrink-0" />}
    </div>
  );
}

// ── Thread list item ─────────────────────────────────────────────────────────

function ThreadItem({
  thread,
  isSelected,
  currentUserId,
  onClick,
}: {
  thread: ThreadSummary;
  isSelected: boolean;
  currentUserId: number;
  onClick: () => void;
}) {
  const statusCfg = thread.applicationStatus ? STATUS_CONFIG[thread.applicationStatus] : null;
  const otherName = thread.otherUser?.name || "Unknown";
  const isMyLastMsg = thread.lastMessage.fromUserId === currentUserId;
  const preview = (isMyLastMsg ? "You: " : "") + thread.lastMessage.body.replace(/\*\*/g, "").replace(/\n/g, " ").slice(0, 55);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
        isSelected ? "bg-primary/8 border border-primary/20" : "border border-transparent hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 mt-0.5">
          <Avatar name={otherName} size="sm" />
          {thread.unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {thread.unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            <span className={`text-sm font-semibold truncate ${thread.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
              {otherName}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(thread.lastMessage.createdAt), { addSuffix: true })}
            </span>
          </div>
          {thread.listingTitle && (
            <p className="text-xs text-primary font-medium truncate mb-0.5">{thread.listingTitle}</p>
          )}
          <p className={`text-xs truncate ${thread.unreadCount > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"}`}>
            {preview || "No messages yet"}
          </p>
          {statusCfg && (
            <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Chat panel (shared between mobile overlay and desktop panel) ─────────────

function ChatPanel({
  threadDetail,
  currentUserId,
  replyBody,
  setReplyBody,
  sending,
  onSend,
  messagesEndRef,
  onBack,
  isMobile,
}: {
  threadDetail: ThreadDetail;
  currentUserId: number;
  replyBody: string;
  setReplyBody: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onBack?: () => void;
  isMobile?: boolean;
}) {
  const app = threadDetail.application;
  const otherUser = threadDetail.otherUser;
  const canReply = ["pending_host_approval", "confirmed"].includes(app.status);
  const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending_host_approval;

  return (
    <>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <Avatar name={otherUser?.name || "?"} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm leading-tight truncate">
            {otherUser?.name || "Unknown"}
          </p>
          {app.listingTitle && (
            <Link href={`/spots/${app.listingId}`}>
              <p className="text-xs text-primary hover:underline truncate flex items-center gap-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                {app.listingTitle}
              </p>
            </Link>
          )}
        </div>
        <StatusPill status={app.status} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {/* Status context line */}
        <div className="flex justify-center py-1 mb-1">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
            {statusCfg.icon}
            {app.status === "pending_host_approval" && "Awaiting host review"}
            {app.status === "confirmed" && "Request confirmed — you're in!"}
            {app.status === "declined" && "Request was declined"}
            {app.status === "waitlisted" && "You're on the waitlist"}
            {app.status === "cancelled" && "Request cancelled"}
          </span>
        </div>

        {threadDetail.messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No messages yet.</p>
        ) : (
          threadDetail.messages.map((msg, i) => {
            const isMe = msg.fromUserId === currentUserId;
            const prevMsg = threadDetail.messages[i - 1];
            const showName = !prevMsg || prevMsg.fromUserId !== msg.fromUserId;
            return (
              <ChatBubble
                key={msg.id}
                message={msg}
                isMe={isMe}
                showName={showName}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      {canReply ? (
        <div className="shrink-0 px-3 py-3 border-t border-border bg-card">
          <div className="flex items-end gap-2">
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Message…"
              rows={isMobile ? 2 : 1}
              style={{ minHeight: isMobile ? 44 : 38 }}
              className="flex-1 resize-none px-3.5 py-2.5 rounded-2xl border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button
              onClick={onSend}
              disabled={!replyBody.trim() || sending}
              aria-label="Send"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                replyBody.trim() && !sending
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-default"
              }`}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 px-1">Enter to send · Shift+Enter for new line</p>
        </div>
      ) : (
        <div className="shrink-0 px-4 py-2.5 border-t border-border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            {app.status === "declined" ? "This request was declined — conversation closed." :
             app.status === "cancelled" ? "This request was cancelled." :
             "Replies are not available for this status."}
          </p>
        </div>
      )}
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function VendorInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const queryParams = new URLSearchParams(search);
  const initialThread = queryParams.get("thread");

  const [tab, setTab] = useState<"threads" | "invitations">("threads");

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(
    initialThread ? parseInt(initialThread) : null
  );
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(!!initialThread);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [invitations, setInvitations] = useState<FlatMessage[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<FlatMessage | null>(null);
  const [invitationsLoading, setInvitationsLoading] = useState(true);

  const loadInvitations = useCallback(async () => {
    if (!user) return;
    setInvitationsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/messages"), { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        const inbox = (data as FlatMessage[]).filter(
          m => m.toUserId === user.id && !m.body.includes("submitted a spot request") && m.type !== "spot_request"
        );
        setInvitations(inbox);
      }
    } catch { }
    finally { setInvitationsLoading(false); }
  }, [user]);

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setThreadsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/messages/threads"), { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        setThreads(data.filter((t: ThreadSummary) => t.applicationId !== null));
        loadInvitations();
      }
    } catch { }
    finally { setThreadsLoading(false); }
  }, [user, loadInvitations]);

  const loadThread = useCallback(async (applicationId: number) => {
    setThreadLoading(true);
    setThreadDetail(null);
    try {
      const res = await fetch(getApiUrl(`/api/messages/thread/${applicationId}`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setThreadDetail(data);
      setThreads(prev => prev.map(t =>
        t.applicationId === applicationId ? { ...t, unreadCount: 0 } : t
      ));
    } catch {
      toast({ title: "Could not load conversation", variant: "destructive" });
    } finally {
      setThreadLoading(false);
    }
  }, [toast]);

  const sendReply = async () => {
    if (!replyBody.trim() || !threadDetail || !user) return;
    setSending(true);
    try {
      const otherUserId = threadDetail.otherUser?.id;
      if (!otherUserId) throw new Error("No recipient");
      const res = await fetch(getApiUrl("/api/messages"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: otherUserId,
          spotApplicationId: threadDetail.application.id,
          body: replyBody.trim(),
          type: "message",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setReplyBody("");
      await loadThread(threadDetail.application.id);
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const markInvitationRead = async (msg: FlatMessage) => {
    if (!msg.isRead && msg.toUserId === user?.id) {
      await fetch(getApiUrl(`/api/messages/${msg.id}/read`), { method: "PUT", headers: authHeaders() });
      setInvitations(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    }
    setSelectedInvitation(msg);
  };

  useEffect(() => { if (user) loadThreads(); }, [user]);

  useEffect(() => {
    if (initialThread && user) {
      const id = parseInt(initialThread);
      setSelectedThreadId(id);
      loadThread(id);
      setMobileShowChat(true);
    }
  }, [initialThread, user]);

  useEffect(() => {
    if (threadDetail) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [threadDetail?.messages?.length]);

  const spotThreads = threads.filter(t => t.applicationId !== null);
  const unreadSpot = spotThreads.reduce((s, t) => s + t.unreadCount, 0);
  const unreadInvite = invitations.filter(m => !m.isRead).length;

  const handleSelectThread = (thread: ThreadSummary) => {
    if (!thread.applicationId) return;
    setSelectedThreadId(thread.applicationId);
    loadThread(thread.applicationId);
    setMobileShowChat(true);
  };

  const handleMobileBack = () => {
    setMobileShowChat(false);
    setSelectedThreadId(null);
    setThreadDetail(null);
  };

  return (
    <Layout>
      {/* ── Mobile full-screen chat overlay ── */}
      {mobileShowChat && tab === "threads" && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-background lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {threadLoading ? (
            <div className="flex-1 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading conversation…
            </div>
          ) : threadDetail ? (
            <ChatPanel
              threadDetail={threadDetail}
              currentUserId={user?.id ?? 0}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              sending={sending}
              onSend={sendReply}
              messagesEndRef={messagesEndRef}
              onBack={handleMobileBack}
              isMobile
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <button onClick={handleMobileBack} className="flex items-center gap-1 text-primary hover:underline mb-4 mx-auto">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <p>Could not load this conversation.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main page content ── */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-5">
          <Link href="/vendor" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Inbox className="w-6 h-6 text-primary" /> Messages
            </h1>
            {(unreadSpot + unreadInvite) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {unreadSpot + unreadInvite}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">Your conversations and event invitations</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("threads")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "threads" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <MapPin className="w-4 h-4" />
            Spot Requests
            {unreadSpot > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadSpot}</span>
            )}
          </button>
          <button
            onClick={() => { setTab("invitations"); loadInvitations(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "invitations" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <CalendarCheck className="w-4 h-4" />
            Invitations & Messages
            {unreadInvite > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadInvite}</span>
            )}
          </button>
        </div>

        {/* ── Spot Request Threads ── */}
        {tab === "threads" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ height: "calc(100vh - 240px)", minHeight: 400 }}>
            {/* Thread list — always visible on desktop; on mobile, shown when no chat open */}
            <div className="lg:col-span-2 overflow-y-auto border border-border rounded-2xl bg-card p-2 space-y-0.5">
              {threadsLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading conversations…
                </div>
              ) : spotThreads.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground px-4">
                  <MessageSquare className="w-9 h-9 mx-auto opacity-25 mb-3" />
                  <p className="font-semibold text-sm">No conversations yet</p>
                  <p className="text-xs mt-1 opacity-70">Apply to a spot and your conversation will appear here.</p>
                  <Link href="/spots">
                    <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                      Browse Spots
                    </button>
                  </Link>
                </div>
              ) : (
                spotThreads.map(thread => (
                  <ThreadItem
                    key={thread.key}
                    thread={thread}
                    isSelected={selectedThreadId === thread.applicationId}
                    currentUserId={user?.id ?? 0}
                    onClick={() => handleSelectThread(thread)}
                  />
                ))
              )}
            </div>

            {/* Thread detail — desktop only (mobile uses overlay) */}
            <div className="hidden lg:flex lg:col-span-3 flex-col border border-border rounded-2xl bg-card overflow-hidden">
              {!selectedThreadId ? (
                <div className="flex-1 flex items-center justify-center text-center px-6 text-muted-foreground">
                  <div>
                    <MessageSquare className="w-10 h-10 mx-auto opacity-20 mb-3" />
                    <p className="font-semibold">Select a conversation</p>
                    <p className="text-sm opacity-70 mt-1">Choose a spot request thread from the left to view the conversation.</p>
                  </div>
                </div>
              ) : threadLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : threadDetail ? (
                <ChatPanel
                  threadDetail={threadDetail}
                  currentUserId={user?.id ?? 0}
                  replyBody={replyBody}
                  setReplyBody={setReplyBody}
                  sending={sending}
                  onSend={sendReply}
                  messagesEndRef={messagesEndRef}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Could not load this conversation.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Invitations & General Messages ── */}
        {tab === "invitations" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-0.5">
              {invitationsLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />Loading…
                </div>
              ) : invitations.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm">No invitations yet</p>
                </div>
              ) : (
                invitations.map(msg => (
                  <button
                    key={msg.id}
                    onClick={() => markInvitationRead(msg)}
                    className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                      selectedInvitation?.id === msg.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted"
                    } ${!msg.isRead ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-1 shrink-0">
                        {!msg.isRead
                          ? <div className="w-2 h-2 rounded-full bg-primary" />
                          : <div className="w-2 h-2" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            <CalendarCheck className="w-3 h-3" />
                            {msg.type === "invitation" ? "Event Invitation" : "Message"}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${!msg.isRead ? "font-semibold" : ""}`}>
                          {msg.subject || (msg.event?.name ? `Re: ${msg.event.name}` : "Message")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          From: {msg.fromUser?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="lg:col-span-2">
              {!selectedInvitation ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <Inbox className="w-10 h-10 mx-auto opacity-30 mb-3" />
                    <p className="font-medium">Select a message to read</p>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      {selectedInvitation.subject && (
                        <h2 className="text-lg font-bold text-foreground mb-1">{selectedInvitation.subject}</h2>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>From: <span className="font-medium text-foreground">{selectedInvitation.fromUser?.name || "Unknown"}</span></span>
                        <span>{format(new Date(selectedInvitation.createdAt), "MMMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                  {selectedInvitation.event && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Link href={`/events/${selectedInvitation.event.id}`}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 border border-blue-200 cursor-pointer">
                          <CalendarCheck className="w-3.5 h-3.5" />
                          {selectedInvitation.event.name}
                        </span>
                      </Link>
                    </div>
                  )}
                  <div
                    className="text-foreground text-sm leading-relaxed bg-muted/30 rounded-xl p-4"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedInvitation.body) }}
                  />
                  {selectedInvitation.type === "invitation" && selectedInvitation.event && (
                    <div className="mt-5 pt-5 border-t border-border">
                      <p className="text-sm font-semibold text-foreground mb-3">Respond to this invitation:</p>
                      <Link href="/vendor/events">
                        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
                          <CalendarCheck className="w-4 h-4" />
                          View & Respond
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
