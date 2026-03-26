import { useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { MapView } from "@/components/MapView";
import { StatusBadge } from "@/components/StatusBadge";
import { MapPin, Globe, Phone, Calendar, Clock, ChevronLeft } from "lucide-react";
import { useGetTruck } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function TruckDetail() {
  const [, params] = useRoute("/trucks/:id");
  const id = parseInt(params?.id || "0", 10);
  
  const { data: truck, isLoading, error } = useGetTruck(id);
  const fallbackImg = `${import.meta.env.BASE_URL}images/truck-placeholder.png`;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !truck) {
    return (
      <Layout>
        <div className="text-center py-24">
          <h2 className="text-2xl font-bold text-foreground">Truck not found</h2>
          <button onClick={() => window.history.back()} className="mt-4 text-primary hover:underline">Go Back</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] bg-muted w-full overflow-hidden">
        <img 
          src={truck.imageUrl || fallbackImg} 
          alt={truck.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Back
            </button>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full uppercase tracking-wider">
                    {truck.cuisine}
                  </span>
                  <StatusBadge status={truck.status} isLive={truck.isLive} className="shadow-lg border-none" />
                </div>
                <h1 className="text-4xl md:text-6xl font-display font-extrabold text-white tracking-tight drop-shadow-md">
                  {truck.name}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content: Info & Map */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-4">About</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {truck.description || "No description provided."}
              </p>
              
              <div className="mt-6 flex flex-wrap gap-6 border-y border-border py-6">
                {truck.currentCity && (
                  <div className="flex items-center text-foreground">
                    <MapPin className="w-5 h-5 text-primary mr-2" />
                    <span className="font-medium">Currently in {truck.currentCity}</span>
                  </div>
                )}
                {truck.phone && (
                  <div className="flex items-center text-foreground">
                    <Phone className="w-5 h-5 text-primary mr-2" />
                    <span className="font-medium">{truck.phone}</span>
                  </div>
                )}
                {truck.website && (
                  <div className="flex items-center text-foreground">
                    <Globe className="w-5 h-5 text-primary mr-2" />
                    <a href={truck.website.startsWith('http') ? truck.website : `https://${truck.website}`} target="_blank" rel="noreferrer" className="font-medium hover:text-primary hover:underline transition-all">
                      {truck.website}
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Schedule Section */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">Where to find us</h2>
              {truck.scheduleEntries && truck.scheduleEntries.length > 0 ? (
                <div className="space-y-4">
                  {truck.scheduleEntries.map(entry => (
                    <div key={entry.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row gap-4 justify-between sm:items-center group hover:border-primary/50 transition-colors">
                      <div>
                        <h4 className="font-bold text-foreground text-lg mb-1">{entry.venueName}</h4>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-1" /> {entry.address}, {entry.city}
                        </div>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-xl min-w-[180px]">
                        <div className="flex items-center text-sm font-medium text-foreground mb-1">
                          <Calendar className="w-4 h-4 mr-2 text-primary" />
                          {format(new Date(entry.startDateTime), "EEE, MMM do")}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2 text-secondary" />
                          {format(new Date(entry.startDateTime), "h:mm a")} - {format(new Date(entry.endDateTime), "h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-muted rounded-2xl border border-dashed border-border text-center">
                  <p className="text-muted-foreground">No upcoming stops scheduled.</p>
                </div>
              )}
            </section>

            {/* Location Map if active schedule */}
            {truck.activeSchedule?.latitude && truck.activeSchedule?.longitude && (
              <section>
                <h2 className="text-2xl font-display font-bold text-foreground mb-6">Current Location</h2>
                <MapView trucks={[truck as any]} height="400px" center={[truck.activeSchedule.latitude, truck.activeSchedule.longitude]} zoom={14} />
              </section>
            )}
          </div>

          {/* Sidebar: Menu */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card border border-border rounded-3xl p-6 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6 pb-4 border-b border-border">Menu</h2>
              
              {truck.menuItems && truck.menuItems.length > 0 ? (
                <div className="space-y-6">
                  {truck.menuItems.map(item => (
                    <div key={item.id} className="group">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors pr-4">{item.name}</h4>
                        <span className="font-semibold text-primary whitespace-nowrap">${item.price.toFixed(2)}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground leading-snug">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Menu not available online.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
