import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useGetTruckMenu, useCreateMenuItem, useDeleteMenuItem } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";

export default function VendorMenu() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  const { data: menu, isLoading } = useGetTruckMenu(myTruck?.id ?? 0, {
    query: { enabled: !!myTruck }
  });

  const createMutation = useCreateMenuItem();
  const deleteMutation = useDeleteMenuItem();

  const [showAdd, setShowAdd] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/trucks/${myTruck?.id}/menu`] });

  const handleAdd = async (data: any) => {
    if (!myTruck) return;
    try {
      await createMutation.mutateAsync({
        id: myTruck.id,
        data: {
          name: data.name,
          price: parseFloat(data.price),
          description: data.description || null,
          category: data.category || null,
        }
      });
      toast({ title: "Menu item added!" });
      reset();
      setShowAdd(false);
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Item deleted" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (!myTruck) return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Create your truck profile first before managing your menu.</p>
        <Link href="/vendor/truck" className="mt-4 inline-block text-primary hover:underline">Create Truck Profile →</Link>
      </div>
    </Layout>
  );

  const grouped = (menu || []).reduce((acc: Record<string, typeof menu[0][]>, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/vendor" className="text-muted-foreground hover:text-primary text-sm">← Back to Dashboard</Link>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Manage Menu</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleSubmit(handleAdd)} className="bg-card border border-card-border rounded-2xl p-5 mb-6 space-y-3">
            <h2 className="font-semibold text-foreground">New Menu Item</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input {...register("name", { required: true })} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="Brisket Taco" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Price *</label>
                <input {...register("price", { required: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="4.50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <input {...register("category")} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="Tacos" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <input {...register("description")} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="Short description..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {createMutation.isPending ? "Adding..." : "Add Item"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:opacity-90">Cancel</button>
            </div>
          </form>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : menu && menu.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</h2>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="text-primary font-semibold">${item.price.toFixed(2)}</span>
                        </div>
                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No menu items yet"
            description="Add items to your menu so customers can see what you serve."
          />
        )}
      </div>
    </Layout>
  );
}
