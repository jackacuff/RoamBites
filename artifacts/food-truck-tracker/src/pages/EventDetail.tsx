import { useParams, Link } from "wouter";
import { useGetEvent } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Clock, FileText, Globe, ExternalLink, Tag, Megaphone } from "lucide-react";
import { getApiUrl } from "@/lib/api";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useGetEvent(Number(id) || 0, {
    query: { enabled: !!id }
  });
  const [specials, setSpecials] = useState<Record<number, any[]>>({});

  useEffect(() => {
    if (!event?.trucks) return;
    const confirmedIds = event.trucks.filter(t => t.status === "confirmed" && t.truck).map(t => t.truck!.id);
    confirmedIds.forEach(async (truckId) => {
      try {
        const res = await fetch(getApiUrl(`/api/trucks/${truckId}/specials`));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSpecials(prev => ({ ...prev, [truckId]: data }));
          }
        }
      } catch {}
    });
  }, [event?.trucks]);

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  if (!event) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Event Not Found</h1>
          <Link href="/events" className="text-primary hover:underline mt-4 inline-block">← Back to Events</Link>
        </div>
      </Layout>
    );
  }

  const confirmedTrucks = event.trucks.filter(t => t.status === "confirmed");
  const now = new Date();
  const isOngoing = new Date(event.startDateTime) <= now && new Date(event.endDateTime) >= now;
  const isUpcoming = new Date(event.startDateTime) > now;

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        {(event as any).bannerImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${(event as any).bannerImageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary" />
        )}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="mb-4">
            <Link href="/events" className="text-white/70 hover:text-white text-sm">← All Events</Link>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {isOngoing && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Happening Now
                </span>
              )}
              {isUpcoming && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
                  Upcoming
                </span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-white leading-tight">{event.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.venueName}, {event.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(event.startDateTime), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {confirmedTrucks.length} truck{confirmedTrucks.length !== 1 ? 's' : ''} confirmed
              </span>
            </div>
            {(event as any).websiteUrl && (
              <a href={(event as any).websiteUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm">
                <Globe className="w-4 h-4" />
                Event Website
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4">Event Details</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Date</p>
                    <p className="text-muted-foreground text-sm">{format(new Date(event.startDateTime), "EEEE, MMMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Time</p>
                    <p className="text-muted-foreground text-sm">
                      {format(new Date(event.startDateTime), "h:mm a")} – {format(new Date(event.endDateTime), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Venue</p>
                    <p className="text-muted-foreground text-sm">{event.venueName}</p>
                    {event.address && <p className="text-muted-foreground text-sm">{event.address}</p>}
                    <p className="text-muted-foreground text-sm">{event.city}</p>
                  </div>
                </div>
                {event.description && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-sm">About</p>
                      <p className="text-muted-foreground text-sm">{event.description}</p>
                    </div>
                  </div>
                )}
                {event.publicNotes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                    <p className="text-sm text-amber-800">{event.publicNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {event.latitude && event.longitude && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Location
                  </h2>
                </div>
                <EventMap lat={event.latitude} lng={event.longitude} venueName={event.venueName} />
              </div>
            )}
          </div>

          {/* Right: Truck Lineup */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-foreground mb-1">
                Food Truck Lineup
              </h2>
              {confirmedTrucks.length > 0 ? (
                <p className="text-muted-foreground text-sm">{confirmedTrucks.length} truck{confirmedTrucks.length !== 1 ? 's' : ''} confirmed for this event</p>
              ) : (
                <p className="text-muted-foreground text-sm">Trucks being finalized — check back soon!</p>
              )}
            </div>

            {confirmedTrucks.length > 0 ? (
              <div className="space-y-4">
                {confirmedTrucks.map((et) => {
                  const truck = et.truck;
                  if (!truck) return null;
                  const truckSpecials = specials[truck.id] || [];
                  return (
                    <Link key={et.id} href={`/trucks/${truck.id}`}>
                      <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start gap-4 p-5">
                          {truck.logoUrl || truck.imageUrl ? (
                            <img
                              src={truck.logoUrl || truck.imageUrl}
                              alt={truck.name}
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-border"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                              {truck.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{truck.name}</h3>
                                <p className="text-sm text-muted-foreground">{truck.cuisine}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {truck.isLive && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Live
                                  </span>
                                )}
                              </div>
                            </div>
                            {truck.description && (
                              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{truck.description}</p>
                            )}
                          </div>
                        </div>
                        {truckSpecials.length > 0 && (
                          <div className="px-5 pb-4">
                            {truckSpecials.slice(0, 2).map((s: any) => (
                              <div key={s.id} className="flex items-center gap-2 text-sm mt-2">
                                {s.type === "special" || s.type === "discount" ? (
                                  <Tag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                ) : (
                                  <Megaphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                )}
                                <span className="text-foreground font-medium">{s.title}</span>
                                {s.body && <span className="text-muted-foreground truncate">— {s.body}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                <Users className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                <p className="text-foreground font-medium">Truck lineup coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">Check back closer to the event date.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function EventMap({ lat, lng, venueName }: { lat: number; lng: number; venueName: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="h-52 bg-muted animate-pulse" />;
  return (
    <div className="h-52">
      <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          <Popup>{venueName}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
