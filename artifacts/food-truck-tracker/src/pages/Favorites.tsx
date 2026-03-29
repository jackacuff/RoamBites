import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/use-auth";
import { Heart, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";

export default function Favorites() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const fallbackImg = `${import.meta.env.BASE_URL}images/truck-placeholder.png`;

  const fetchFavorites = async () => {
    try {
      const res = await fetch(getApiUrl("/api/favorites"), { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setFavorites(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchFavorites();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const removeFavorite = async (truckId: number) => {
    setRemoving(truckId);
    try {
      await fetch(getApiUrl(`/api/favorites/${truckId}`), { method: "DELETE", headers: authHeaders() });
      setFavorites(prev => prev.filter(f => f.truckId !== truckId));
    } catch {}
    setRemoving(null);
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">My Favorites</h1>
          <p className="text-muted-foreground mb-8">Sign in to save your favorite food trucks.</p>
          <Link href="/login" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-md hover:-translate-y-0.5 transition-all">
            Log In
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            My Favorites
          </h1>
          <p className="text-muted-foreground mt-1">Food trucks you've favorited.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-3xl border border-dashed border-border">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6">Browse trucks and tap the heart to save them here.</p>
            <Link href="/trucks" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-md hover:-translate-y-0.5 transition-all">
              Browse Trucks
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map(fav => (
              <div key={fav.id} className="group flex flex-col bg-card rounded-3xl overflow-hidden shadow-lg shadow-primary/5 border border-border/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
                <button
                  onClick={() => removeFavorite(fav.truckId)}
                  disabled={removing === fav.truckId}
                  className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                  title="Remove from favorites"
                >
                  {removing === fav.truckId
                    ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    : <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  }
                </button>

                <Link href={`/trucks/${fav.truckId}`} className="block">
                  <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                    <img
                      src={fav.truck?.imageUrl || fallbackImg}
                      alt={fav.truck?.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-4 right-4 z-10">
                      <StatusBadge status={fav.truck?.status} isLive={fav.truck?.isLive} />
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="text-xl font-display font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {fav.truck?.name}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary-foreground whitespace-nowrap">
                        {fav.truck?.cuisine}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm flex-1 line-clamp-2 leading-relaxed">
                      {fav.truck?.description || `A great ${fav.truck?.cuisine} food truck.`}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1.5 text-primary" />
                        <span className="truncate max-w-[120px]">Various Locations</span>
                      </div>
                      <div className="flex items-center text-sm font-semibold text-primary">
                        View details <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
