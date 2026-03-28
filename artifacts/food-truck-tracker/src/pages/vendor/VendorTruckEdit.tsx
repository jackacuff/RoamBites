import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useCreateTruck, useUpdateTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ArrowLeft, Eye, Share2 } from "lucide-react";

export default function VendorTruckEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks, isLoading } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  const createMutation = useCreateTruck();
  const updateMutation = useUpdateTruck();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      cuisine: "",
      description: "",
      phone: "",
      website: "",
      isOpenForReservations: false,
      reservationEmail: "",
      reservationPhone: "",
      reservationContactPreference: "email",
      reservationNotes: "",
      twitterHandle: "",
      instagramHandle: "",
      facebookUrl: "",
      tiktokHandle: "",
      youtubeUrl: "",
    }
  });

  const isOpenForReservations = watch("isOpenForReservations");

  useEffect(() => {
    if (myTruck) {
      reset({
        name: myTruck.name,
        cuisine: myTruck.cuisine,
        description: myTruck.description ?? "",
        phone: (myTruck as any).phone ?? "",
        website: (myTruck as any).website ?? "",
        isOpenForReservations: (myTruck as any).isOpenForReservations ?? false,
        reservationEmail: (myTruck as any).reservationEmail ?? "",
        reservationPhone: (myTruck as any).reservationPhone ?? "",
        reservationContactPreference: (myTruck as any).reservationContactPreference ?? "email",
        reservationNotes: (myTruck as any).reservationNotes ?? "",
        twitterHandle: (myTruck as any).twitterHandle ?? "",
        instagramHandle: (myTruck as any).instagramHandle ?? "",
        facebookUrl: (myTruck as any).facebookUrl ?? "",
        tiktokHandle: (myTruck as any).tiktokHandle ?? "",
        youtubeUrl: (myTruck as any).youtubeUrl ?? "",
      });
    }
  }, [myTruck, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (myTruck) {
        await updateMutation.mutateAsync({ id: myTruck.id, data });
        toast({ title: "Truck profile updated!" });
      } else {
        await createMutation.mutateAsync({ data });
        toast({ title: "Truck created! Pending admin approval." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/vendor/truck" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary text-sm">
            <ArrowLeft className="w-4 h-4" />
            {myTruck ? "View Public Profile" : "Back"}
          </Link>
          {myTruck && (
            <Link href={`/trucks/${myTruck.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
              <Eye className="w-4 h-4" />
              Customer view
            </Link>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">{myTruck ? "Edit Truck Profile" : "Create Your Truck"}</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {myTruck ? "Update your public-facing profile information." : "Set up your truck profile to start listing on RoamBites."}
        </p>

        {myTruck && !myTruck.isApproved && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Your truck is pending admin approval. It will appear publicly once approved.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide text-muted-foreground">Basic Info</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Truck Name *</label>
              <input
                {...register("name", { required: "Name is required" })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                placeholder="Red Dirt Tacos"
              />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cuisine Type *</label>
              <input
                {...register("cuisine", { required: "Cuisine is required" })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                placeholder="Tacos & Mexican"
              />
              {errors.cuisine && <p className="text-destructive text-sm mt-1">{errors.cuisine.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground resize-none"
                placeholder="Tell customers about your food truck..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  {...register("phone")}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  placeholder="+1 (405) 555-0100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Website</label>
                <input
                  {...register("website")}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  placeholder="https://yoursite.com"
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Social Media</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Connect your social accounts so customers can follow you and you can share when you go live.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">X (Twitter) handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    {...register("twitterHandle")}
                    className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="yourhandle"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Instagram handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    {...register("instagramHandle")}
                    className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="yourhandle"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">TikTok handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    {...register("tiktokHandle")}
                    className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="yourhandle"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Facebook URL</label>
                <input
                  {...register("facebookUrl")}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">YouTube URL</label>
                <input
                  {...register("youtubeUrl")}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  placeholder="https://youtube.com/@yourchannel"
                />
              </div>
            </div>
          </div>

          {/* Reservation Settings */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Reservation Settings</h3>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input type="checkbox" {...register("isOpenForReservations")} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-foreground font-medium">Accept booking / reservation requests</span>
            </label>
            {isOpenForReservations && (
              <div className="space-y-3 pl-7">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Email for Requests</label>
                  <input
                    {...register("reservationEmail")}
                    type="email"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="bookings@yourtruckname.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Phone for Requests</label>
                  <input
                    {...register("reservationPhone")}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="+1 (405) 555-0100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Notes for Customers</label>
                  <textarea
                    {...register("reservationNotes")}
                    rows={2}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground resize-none"
                    placeholder="e.g. Minimum 50 guests, available on weekends only..."
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : myTruck ? "Save Changes" : "Create Truck"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
