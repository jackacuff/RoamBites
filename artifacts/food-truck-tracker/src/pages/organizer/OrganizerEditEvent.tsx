import { useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetEvent, useUpdateEvent } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function OrganizerEditEvent() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const eventId = Number(id);

  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } });
  const updateMutation = useUpdateEvent();

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (event) {
      reset({
        name: event.name,
        description: event.description ?? "",
        venueName: event.venueName,
        address: event.address ?? "",
        city: event.city,
        startDateTime: format(new Date(event.startDateTime), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(new Date(event.endDateTime), "yyyy-MM-dd'T'HH:mm"),
        publicNotes: event.publicNotes ?? "",
        isPublished: event.isPublished,
      });
    }
  }, [event, reset]);

  const onSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({
        id: eventId,
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
      toast({ title: "Event updated!" });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      setLocation(`/organizer/events/${eventId}/manage`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href={`/organizer/events/${eventId}/manage`} className="text-muted-foreground hover:text-primary text-sm">← Back to Event</Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Edit Event</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Event Name *</label>
            <input {...register("name", { required: true })} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea {...register("description")} rows={3} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Venue Name *</label>
            <input {...register("venueName", { required: true })} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Address</label>
              <input {...register("address")} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">City *</label>
              <input {...register("city", { required: true })} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date & Time *</label>
              <input {...register("startDateTime", { required: true })} type="datetime-local" className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date & Time *</label>
              <input {...register("endDateTime", { required: true })} type="datetime-local" className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Public Notes</label>
            <input {...register("publicNotes")} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
          </div>
          <div className="flex items-center gap-3">
            <input {...register("isPublished")} type="checkbox" id="pub" className="w-4 h-4 accent-primary" />
            <label htmlFor="pub" className="text-sm text-foreground">Published (visible to public)</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <Link href={`/organizer/events/${eventId}/manage`}>
              <button type="button" className="px-4 py-2.5 bg-muted text-muted-foreground rounded-lg hover:opacity-90">Cancel</button>
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
