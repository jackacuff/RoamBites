import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { TruckCard } from "@/components/TruckCard";
import { MapPin, Search, Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useListTrucks, useListEvents } from "@workspace/api-client-react";
import { useState } from "react";

export default function Home() {
  const { data: trucks, isLoading: loadingTrucks } = useListTrucks({ openNow: true });
  const { data: events, isLoading: loadingEvents } = useListEvents({ upcoming: true });
  const [, navigate] = useLocation();
  const [heroSearch, setHeroSearch] = useState("");

  const heroBg = `${import.meta.env.BASE_URL}images/hero-bg.png`;

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/trucks?search=${encodeURIComponent(q)}` : "/trucks");
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-48 overflow-hidden">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6 shadow-sm border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Over 40 trucks serving today
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-foreground tracking-tight mb-8 leading-tight">
              Find your flavor in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Central Oklahoma</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Track your favorite food trucks, discover new cuisines, and find live street food events happening near you right now.
            </p>

            {/* Hero Search Bar */}
            <form onSubmit={handleHeroSearch} className="flex items-center max-w-xl mx-auto mb-8 shadow-xl rounded-full overflow-hidden border border-border bg-background">
              <div className="flex items-center flex-1 pl-5 gap-3">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search tacos, BBQ, pizza…"
                  className="flex-1 py-4 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="m-1.5 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
              >
                Search
              </button>
            </form>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/trucks" className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center group">
                Browse All Trucks
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/events" className="w-full sm:w-auto px-8 py-4 rounded-full bg-card border-2 border-border text-foreground font-bold text-lg hover:border-primary/50 hover:bg-muted transition-all flex items-center justify-center">
                <Calendar className="mr-2 w-5 h-5 text-primary" />
                View Events
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Now Section */}
      <section className="py-20 bg-card border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">Live & Open Now</h2>
              <p className="text-muted-foreground">Grab a bite right away from these spots.</p>
            </div>
            <Link href="/trucks?openNow=true" className="hidden sm:flex items-center text-primary font-semibold hover:text-primary/80 transition-colors">
              See map <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {loadingTrucks ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 rounded-3xl bg-muted animate-pulse border border-border" />
              ))}
            </div>
          ) : trucks && trucks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trucks.slice(0, 4).map(truck => (
                <TruckCard key={truck.id} truck={truck} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
              <p className="text-muted-foreground">No trucks are currently open. Check back later!</p>
            </div>
          )}
          
          <Link href="/trucks?openNow=true" className="sm:hidden mt-8 w-full flex items-center justify-center py-3 rounded-xl bg-muted text-foreground font-medium">
            View all open trucks
          </Link>
        </div>
      </section>

      {/* Categories / Cities */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-center text-foreground mb-12">Popular Spots</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Oklahoma City', 'Edmond', 'Norman', 'Moore'].map(city => (
              <Link 
                key={city} 
                href={`/trucks?city=${encodeURIComponent(city)}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex items-center justify-center bg-card border border-border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-center z-10">
                  <MapPin className="w-8 h-8 mx-auto mb-3 text-primary/50 group-hover:text-primary transition-colors" />
                  <span className="font-display font-bold text-lg text-foreground">{city}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

// Temporary internal component export for icon
function ArrowRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
}
