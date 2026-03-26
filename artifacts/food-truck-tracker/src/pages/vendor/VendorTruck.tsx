import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useCreateTruck, useUpdateTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function VendorTruck() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks, isLoading } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  const createMutation = useCreateTruck();
  const updateMutation = useUpdateTruck();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: "", cuisine: "", description: "" }
  });

  useEffect(() => {
    if (myTruck) {
      reset({
        name: myTruck.name,
        cuisine: myTruck.cuisine,
        description: myTruck.description ?? "",
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
        <div className="mb-4">
          <Link href="/vendor" className="text-muted-foreground hover:text-primary text-sm">← Back to Dashboard</Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">{myTruck ? "Edit Truck Profile" : "Create Your Truck"}</h1>

        {myTruck && !myTruck.isApproved && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Your truck is pending admin approval. It will appear publicly once approved.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
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

          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : myTruck ? "Update Profile" : "Create Truck"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
