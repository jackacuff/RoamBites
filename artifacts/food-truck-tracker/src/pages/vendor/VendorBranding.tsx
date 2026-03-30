import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, Trash2, ImageIcon, Star, AlertCircle, CheckCircle2, Crown, Lock, X, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const API_BASE = getApiUrl("");

interface TruckMedia {
  id: number;
  truckId: number;
  type: string;
  url: string;
  fileName: string;
  altText?: string;
  sortOrder?: number;
  createdAt: string;
}

interface Truck {
  id: number;
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  imageUrl?: string;
}

interface VendorSub {
  status: string;
  planName: string;
}

function useVendorTruck() {
  const [truck, setTruck] = useState<Truck | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(getApiUrl("/api/trucks?mine=true"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    const myTruck: Truck | undefined = Array.isArray(data) ? data[0] : data;
    setTruck(myTruck ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  return { truck, loading, reload: load };
}

function useMedia(truckId: number | null) {
  const [media, setMedia] = useState<TruckMedia[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!truckId) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch(getApiUrl(`/api/trucks/${truckId}/media`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setMedia(await res.json());
    setLoading(false);
  };

  useEffect(() => { if (truckId) load(); }, [truckId]);
  return { media, loading, reload: load };
}

function useSubscription() {
  const [sub, setSub] = useState<VendorSub | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(getApiUrl("/api/vendor/subscription"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => setSub(data))
      .catch(() => {});
  }, []);
  return sub;
}

type UploadType = "logo" | "cover" | "gallery" | "menu_image" | "menu_pdf";

interface UploadCardProps {
  type: UploadType;
  label: string;
  description: string;
  accept: string;
  truckId: number;
  existing?: TruckMedia;
  onDone: () => void;
  currentImageUrl?: string;
  onSetThumbnail?: (mediaId: number) => Promise<void>;
}

function UploadCard({ type, label, description, accept, truckId, existing, onDone, currentImageUrl, onSetThumbnail }: UploadCardProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingThumb, setSettingThumb] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isThumbnail = existing && currentImageUrl && existing.url === currentImageUrl;

  const handleSetThumbnail = async () => {
    if (!existing || !onSetThumbnail) return;
    setSettingThumb(true);
    await onSetThumbnail(existing.id);
    setSettingThumb(false);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem("token");

      const urlRes = await fetch(getApiUrl("/api/storage/uploads/request-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");

      const fileUrl = getApiUrl(`/api/storage${objectPath}`);

      const mediaRes = await fetch(getApiUrl(`/api/trucks/${truckId}/media`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          url: fileUrl,
          fileName: file.name,
          altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          sortOrder: 0,
          contentType: file.type,
          size: file.size,
        }),
      });
      if (!mediaRes.ok) {
        const err = await mediaRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save media");
      }

      toast({ title: `${label} uploaded`, description: "Your image has been saved." });
      onDone();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/trucks/${truckId}/media/${existing.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete media");
      toast({ title: `${label} removed` });
      onDone();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const isPdf = type === "menu_pdf";

  return (
    <div className="border rounded-xl p-4 bg-card flex flex-col gap-3">
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {existing && !isPdf && (
        <div className="relative group">
          {isThumbnail && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              <Star className="w-3 h-3 fill-white" /> Thumbnail
            </div>
          )}
          <img
            src={existing.url}
            alt={existing.altText || label}
            className={`rounded-lg object-cover w-full border ${type === "logo" ? "h-28 object-contain bg-muted" : "h-48"}`}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-2 flex-wrap p-2">
            {onSetThumbnail && !isThumbnail && (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-white border-0" onClick={handleSetThumbnail} disabled={settingThumb}>
                {settingThumb ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Star className="w-3 h-3 mr-1" />} Set thumbnail
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3 h-3 mr-1" /> Replace
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      )}

      {existing && isPdf && (
        <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/40">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{existing.fileName}</p>
            <a href={existing.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View PDF</a>
          </div>
          <Button size="icon" variant="destructive" className="shrink-0" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {!existing && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition"
        >
          {uploading ? (
            <><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Uploading…</span></>
          ) : (
            <><ImageIcon className="w-6 h-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to upload {label.toLowerCase()}</span></>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

function Lightbox({ items, index, onClose, onPrev, onNext }: {
  items: TruckMedia[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const item = items[index];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
        onClick={onClose}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const diff = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(diff) > 50) diff < 0 ? onNext() : onPrev();
          touchStartX.current = null;
        }}
      >
        <button onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition">
          <X className="w-6 h-6" />
        </button>
        {items.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition disabled:opacity-30"
              disabled={index === 0}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition disabled:opacity-30"
              disabled={index === items.length - 1}>
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        <motion.img
          key={item.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          src={item.url}
          alt={item.altText || "Gallery photo"}
          className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {items.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {items.map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${i === index ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40"}`} />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface GalleryManagerProps {
  truckId: number;
  galleryItems: TruckMedia[];
  onDone: () => void;
  isPro: boolean;
  maxPhotos: number;
  currentImageUrl?: string;
}

function GalleryManager({ truckId, galleryItems, onDone, isPro, maxPhotos, currentImageUrl }: GalleryManagerProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [featuring, setFeaturing] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = galleryItems.length >= maxPhotos;

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const token = localStorage.getItem("token");
    if (atLimit) {
      toast({ title: `Photo limit reached`, description: isPro ? `Max ${maxPhotos} photos reached.` : `Upgrade to Pro for more photos.`, variant: "destructive" });
      setUploading(false);
      return;
    }
    let success = 0;
    for (const file of Array.from(files)) {
      if (galleryItems.length + success >= maxPhotos) break;
      try {
        const urlRes = await fetch(getApiUrl("/api/storage/uploads/request-url"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!urlRes.ok) continue;
        const { uploadURL, objectPath } = await urlRes.json();

        const uploadRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!uploadRes.ok) continue;

        const fileUrl = getApiUrl(`/api/storage${objectPath}`);
        const mediaRes = await fetch(getApiUrl(`/api/trucks/${truckId}/media`), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: "gallery", url: fileUrl, fileName: file.name, sortOrder: galleryItems.length + success, contentType: file.type, size: file.size }),
        });
        if (mediaRes.ok) success++;
      } catch { /* skip */ }
    }
    setUploading(false);
    if (success > 0) { toast({ title: `${success} photo${success > 1 ? "s" : ""} added` }); onDone(); }
    else toast({ title: "Upload failed", variant: "destructive" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (mediaId: number) => {
    setDeleting(mediaId);
    const token = localStorage.getItem("token");
    const res = await fetch(getApiUrl(`/api/trucks/${truckId}/media/${mediaId}`), {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { toast({ title: "Photo removed" }); onDone(); }
    else toast({ title: "Delete failed", variant: "destructive" });
    setDeleting(null);
  };

  const handleFeature = async (mediaId: number) => {
    setFeaturing(mediaId);
    const token = localStorage.getItem("token");
    const res = await fetch(getApiUrl(`/api/trucks/${truckId}/media/${mediaId}/set-featured`), {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { toast({ title: "Set as card thumbnail!" }); onDone(); }
    else toast({ title: "Failed to set thumbnail", variant: "destructive" });
    setFeaturing(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">Photo Gallery</p>
            {isPro
              ? <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> Pro</span>
              : <span className="text-xs text-muted-foreground">({galleryItems.length}/{maxPhotos} photos)</span>}
          </div>
          <p className="text-xs text-muted-foreground">Hover a photo and click ★ to make it the card thumbnail.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading || atLimit}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
          Add Photos
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
      />
      {galleryItems.length === 0 && !uploading && (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 py-8 w-full cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition">
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Upload photos to show off your truck</span>
        </button>
      )}
      {galleryItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {galleryItems.map((m, idx) => {
            const isThumb = currentImageUrl && m.url === currentImageUrl;
            return (
              <div key={m.id} className={`relative group rounded-lg overflow-hidden border-2 aspect-square bg-muted ${isThumb ? "border-amber-400" : "border-transparent"}`}>
                {isThumb && (
                  <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow">
                    <Star className="w-3 h-3 fill-white" /> Thumbnail
                  </div>
                )}
                <img
                  src={m.url}
                  alt={m.altText || "Gallery photo"}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setLightboxIndex(idx)}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button title="View full size" onClick={() => setLightboxIndex(idx)}
                    className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition">
                    <Expand className="w-4 h-4" />
                  </button>
                  {!isThumb && (
                    <button title="Set as card thumbnail" onClick={(e) => { e.stopPropagation(); handleFeature(m.id); }} disabled={featuring === m.id}
                      className="p-1.5 rounded-full bg-amber-400/90 hover:bg-amber-400 text-white transition">
                      {featuring === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                    </button>
                  )}
                  <button title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} disabled={deleting === m.id}
                    className="p-1.5 rounded-full bg-destructive/90 hover:bg-destructive text-white transition">
                    {deleting === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {lightboxIndex !== null && (
        <Lightbox
          items={galleryItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex(i => Math.min(galleryItems.length - 1, (i ?? 0) + 1))}
        />
      )}

      {/* Pro upsell when at Base limit */}
      {atLimit && !isPro && (
        <div className="flex items-center gap-3 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 mt-1">
          <Crown className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Unlock more photos with Pro</p>
            <p className="text-xs text-amber-700">Pro vendors can upload up to 12 gallery photos.</p>
          </div>
          <a href="/vendor/subscription" className="text-xs font-bold text-amber-700 underline underline-offset-2 shrink-0">Upgrade</a>
        </div>
      )}
    </div>
  );
}

export default function VendorBranding() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { truck, loading: truckLoading, reload: reloadTruck } = useVendorTruck();
  const { media, loading: mediaLoading, reload: reloadMedia } = useMedia(truck?.id ?? null);
  const reload = () => { reloadTruck(); reloadMedia(); };
  const sub = useSubscription();

  const isPro = sub?.planName?.toLowerCase().includes("pro") ?? false;
  const maxPhotos = isPro ? 12 : 3;

  const handleSetThumbnail = async (mediaId: number): Promise<void> => {
    const token = localStorage.getItem("token");
    const res = await fetch(getApiUrl(`/api/trucks/${truck?.id}/media/${mediaId}/set-featured`), {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { toast({ title: "Card thumbnail updated!" }); reload(); }
    else toast({ title: "Failed to update thumbnail", variant: "destructive" });
  };

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
    else if (user && user.role !== "vendor" && user.role !== "admin" && user.role !== "superadmin") navigate("/");
  }, [isAuthenticated, user]);

  if (truckLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!truck) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto py-12 px-4 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-xl font-semibold mb-2">No truck yet</h2>
          <p className="text-muted-foreground mb-4">Create your truck profile first before uploading branding.</p>
          <Button onClick={() => navigate("/vendor/truck")}>Set Up Your Truck</Button>
        </div>
      </Layout>
    );
  }

  const logoMedia = media.find(m => m.type === "logo");
  const coverMedia = media.find(m => m.type === "cover");
  const galleryMedia = media.filter(m => m.type === "gallery");
  const menuImageMedia = media.find(m => m.type === "menu_image");
  const menuPdfMedia = media.find(m => m.type === "menu_pdf");

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Branding &amp; Media</h1>
          <p className="text-muted-foreground mt-1">Upload your logo, cover photo, gallery images, and menu for <strong>{truck.name}</strong>.</p>
        </div>

        {truck.logoUrl || truck.coverImageUrl ? (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-6">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Your branding looks great! Customers will see your images on your truck page.
          </div>
        ) : null}

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity</CardTitle>
              <CardDescription>Your logo and cover photo appear on your truck's public profile.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <UploadCard
                type="logo"
                label="Logo"
                description="Square PNG or JPG, max 5 MB"
                accept="image/png,image/jpeg,image/webp"
                truckId={truck.id}
                existing={logoMedia}
                onDone={reload}
              />
              <UploadCard
                type="cover"
                label="Cover Photo"
                description="Wide banner image, max 5 MB"
                accept="image/png,image/jpeg,image/webp"
                truckId={truck.id}
                existing={coverMedia}
                onDone={reload}
                currentImageUrl={truck.imageUrl}
                onSetThumbnail={handleSetThumbnail}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photo Gallery</CardTitle>
              <CardDescription>Show off your truck, food, and vibe. Photos appear on your public truck page.</CardDescription>
            </CardHeader>
            <CardContent>
              <GalleryManager
                truckId={truck.id}
                galleryItems={galleryMedia}
                onDone={reload}
                isPro={isPro}
                maxPhotos={maxPhotos}
                currentImageUrl={truck.imageUrl}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Menu Media</CardTitle>
              <CardDescription>Upload a menu image or PDF for customers to browse.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <UploadCard
                type="menu_image"
                label="Menu Image"
                description="PNG or JPG of your menu, max 5 MB"
                accept="image/png,image/jpeg,image/webp"
                truckId={truck.id}
                existing={menuImageMedia}
                onDone={reload}
              />
              <UploadCard
                type="menu_pdf"
                label="Menu PDF"
                description="PDF format, max 10 MB"
                accept="application/pdf"
                truckId={truck.id}
                existing={menuPdfMedia}
                onDone={reload}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
