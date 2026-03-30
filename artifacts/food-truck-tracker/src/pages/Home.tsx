import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { TruckCard } from "@/components/TruckCard";
import { MapPin, Search, Calendar, ChevronRight, Navigation, Star, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { useListEvents } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";

type FeaturedMode = "nearby" | "live" | "top";

interface FeaturedResponse {
  trucks: any[];
  mode: FeaturedMode;
}

export default function Home() {
  const { data: events, isLoading: loadingEvents } = useListEvents({ upcoming: true });
  const [, navigate] = useLocation();
  const [heroSearch, setHeroSearch] = useState("");
  const [featured, setFeatured] = useState<FeaturedResponse | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const heroBg = `${import.meta.env.BASE_URL}images/hero-bg.png`;

  useEffect(() => {
    function fetchFeatured(lat?: number, lng?: number) {
      const url = (lat !== undefined && lng !== undefined)
        ? getApiUrl(`/api/trucks/featured?lat=${lat}&lng=${lng}`)
        : getApiUrl(`/api/trucks/featured`);
      return fetch(url)
        .then((r) => r.json())
        .then((data: FeaturedResponse) => setFeatured(data))
        .catch(() => {});
    }

    // Fetch immediately without location so cards appear right away
    fetchFeatured().finally(() => setFeaturedLoading(false));

    // Silently refetch with real location if permission is already granted
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationLabel("Near you");
          fetchFeatured(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { timeout: 4000, maximumAge: 120000 }
      );
    }
  }, []);

  const modeConfig: Record<FeaturedMode, { heading: string; sub: string }> = {
    nearby: {
      heading: "Open Near You",
      sub: "Food trucks currently serving in your area.",
    },
    live: {
      heading: "Live & Open Now",
      sub: "These trucks are currently serving across Central Oklahoma.",
    },
    top: {
      heading: "Top Picks",
      sub: "Our highest-rated trucks on the platform right now.",
    },
  };

  const mode = featured?.mode ?? "live";
  const { heading, sub } = modeConfig[mode];

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/trucks?search=${encodeURIComponent(q)}` : "/trucks");
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-36 lg:pb-48 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroBg} alt="Oklahoma sunset background" className="w-full h-full object-cover opacity-15 dark:opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary font-semibold text-xs sm:text-sm mb-4 sm:mb-6 shadow-sm border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Over 40 trucks serving today
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-foreground tracking-tight mb-4 sm:mb-6 leading-tight">
              Find your flavor in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Central Oklahoma</span>
            </h1>
            
            <p className="text-sm sm:text-lg md:text-xl text-muted-foreground mb-5 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              Track your favorite food trucks, discover new cuisines, and find live street food events happening near you right now.
            </p>

            {/* Hero Search Bar */}
            <form onSubmit={handleHeroSearch} className="flex items-center max-w-xl mx-auto mb-5 sm:mb-8 shadow-lg rounded-full overflow-hidden border border-border bg-background">
              <div className="flex items-center flex-1 pl-4 sm:pl-5 gap-2 sm:gap-3">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search tacos, BBQ, pizza…"
                  className="flex-1 py-3 sm:py-4 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="m-1 sm:m-1.5 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
              >
                Search
              </button>
            </form>
            
            <div className="flex flex-row sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/trucks" className="flex-1 sm:flex-none sm:w-auto px-5 sm:px-8 py-3 sm:py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm sm:text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center group">
                Browse Trucks
                <ArrowRight className="ml-1.5 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/events" className="flex-1 sm:flex-none sm:w-auto px-5 sm:px-8 py-3 sm:py-4 rounded-full bg-card border-2 border-border text-foreground font-bold text-sm sm:text-lg hover:border-primary/50 hover:bg-muted transition-all flex items-center justify-center">
                <Calendar className="mr-1.5 w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Events
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Trucks Section */}
      <section className="py-10 sm:py-20 bg-card border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-6 sm:mb-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">{heading}</h2>
                {mode === "nearby" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold border border-green-500/20">
                    <Navigation className="w-3 h-3" /> Near you
                  </span>
                )}
                {mode === "live" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                    <Wifi className="w-3 h-3" /> Live
                  </span>
                )}
                {mode === "top" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
                    <Star className="w-3 h-3" /> Top rated
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">{sub}</p>
            </div>
            <Link href="/trucks" className="hidden sm:flex items-center text-primary font-semibold hover:text-primary/80 transition-colors">
              See all <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 rounded-3xl bg-muted animate-pulse border border-border" />
              ))}
            </div>
          ) : featured && featured.trucks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featured.trucks.slice(0, 4).map((truck) => (
                <TruckCard key={truck.id} truck={truck} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
              <p className="text-muted-foreground font-medium mb-1">No trucks found nearby.</p>
              <p className="text-sm text-muted-foreground">Try browsing all trucks or check back when more vendors go live.</p>
            </div>
          )}
          
          <Link href="/trucks" className="sm:hidden mt-8 w-full flex items-center justify-center py-3 rounded-xl bg-muted text-foreground font-medium">
            Browse all trucks
          </Link>
        </div>
      </section>

      {/* Categories / Cities */}
      <section className="py-12 sm:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-3xl font-display font-bold text-center text-foreground mb-5 sm:mb-12">Popular Spots</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {['Oklahoma City', 'Edmond', 'Norman', 'Moore'].map(city => (
              <Link 
                key={city} 
                href={`/trucks?city=${encodeURIComponent(city)}`}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl aspect-[4/3] flex items-center justify-center bg-card border border-border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-center z-10">
                  <MapPin className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-3 text-primary/50 group-hover:text-primary transition-colors" />
                  <span className="font-display font-bold text-sm sm:text-lg text-foreground">{city}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function ArrowRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
}
