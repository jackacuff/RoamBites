import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useCreateEvent } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function OrganizerNewEvent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const createMutation = useCreateEvent();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      description: "",
      venueName: "",
      address: "",
      city: "Oklahoma City",
      startDateTime: "",
      endDateTime: "",
      publicNotes: "",
      isPublished: false,
    }
  });

  const onSubmit = async (data: any) => {
    try {
      const event = await createMutation.mutateAsync({
        data: {
          name: data.name,
          description: data.description || null,
          venueName: data.venueName,
          address: data.address || null,
          city: data.city,
          startDateTime: new Date(data.startDateTime).toISOString(),
          endDateTime: new Date(data.endDateTime).toISOString(),
          publicNotes: data.publicNotes || null,
          isPublished: !!data.isPublished,
        }
      });
      toast({ title: "Event created!" });
      setLocation(`/organizer/events/${event.id}/manage`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/organizer" className="text-muted-foreground hover:text-primary text-sm">← Back to Dashboard</Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Event Name *</label>
            <input
              {...register("name", { required: "Event name is required" })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              placeholder="Midtown Food Truck Rally"
            />
            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground resize-none"
              placeholder="Describe your event..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Venue Name *</label>
            <input
              {...register("venueName", { required: "Venue is required" })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              placeholder="Scissortail Park"
            />
            {errors.venueName && <p className="text-destructive text-sm mt-1">{errors.venueName.message as string}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Street Address</label>
              <input
                {...register("address")}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                placeholder="300 SW 7th St"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">City *</label>
              <input
                {...register("city", { required: true })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date & Time *</label>
              <input
                {...register("startDateTime", { required: true })}
                type="datetime-local"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date & Time *</label>
              <input
                {...register("endDateTime", { required: true })}
                type="datetime-local"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Public Notes</label>
            <input
              {...register("publicNotes")}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              placeholder="Parking available at..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              {...register("isPublished")}
              type="checkbox"
              id="isPublished"
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="isPublished" className="text-sm text-foreground">
              Publish immediately (visible to public)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Event"}
            </button>
            <Link href="/organizer">
              <button type="button" className="px-4 py-2.5 bg-muted text-muted-foreground rounded-lg hover:opacity-90">
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
