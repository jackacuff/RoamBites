import { useParams, Link } from "wouter";
import { useGetEvent } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Clock, FileText } from "lucide-react";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useGetEvent(Number(id) || 0, {
    query: { enabled: !!id }
  });

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/events" className="text-muted-foreground hover:text-primary text-sm">← Back to Events</Link>
        </div>

        <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-primary-foreground">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {isOngoing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold mb-3">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Happening Now
                  </span>
                )}
                <h1 className="text-3xl font-bold">{event.name}</h1>
                <div className="flex items-center gap-2 mt-2 text-primary-foreground/80">
                  <MapPin className="w-4 h-4" />
                  <span>{event.venueName}, {event.city}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-primary-foreground/70 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{confirmedTrucks.length} truck{confirmedTrucks.length !== 1 ? 's' : ''} confirmed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Date</p>
                    <p className="text-muted-foreground">{format(new Date(event.startDateTime), "EEEE, MMMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Time</p>
                    <p className="text-muted-foreground">
                      {format(new Date(event.startDateTime), "h:mm a")} – {format(new Date(event.endDateTime), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Venue</p>
                    <p className="text-muted-foreground">{event.venueName}</p>
                    {event.address && <p className="text-muted-foreground text-sm">{event.address}, {event.city}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {event.description && (
                  <div>
                    <p className="font-medium text-foreground mb-1">About This Event</p>
                    <p className="text-muted-foreground">{event.description}</p>
                  </div>
                )}
                {event.publicNotes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Notes</p>
                      <p className="text-muted-foreground">{event.publicNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {event.latitude && event.longitude && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Location</h2>
                <EventMap lat={event.latitude} lng={event.longitude} venueName={event.venueName} />
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-4">
                Participating Food Trucks
                {confirmedTrucks.length > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground font-normal">({confirmedTrucks.length} confirmed)</span>
                )}
              </h2>
              {confirmedTrucks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {confirmedTrucks.map((et) => (
                    et.truck && (
                      <Link key={et.id} href={`/trucks/${et.truck.id}`}>
                        <div className="flex items-center gap-4 p-4 border border-border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                            {et.truck.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{et.truck.name}</p>
                            <p className="text-sm text-muted-foreground">{et.truck.cuisine}</p>
                          </div>
                          {et.truck.isLive && (
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Live</span>
                          )}
                        </div>
                      </Link>
                    )
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No trucks confirmed yet. Check back soon!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function EventMap({ lat, lng, venueName }: { lat: number; lng: number; venueName: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="h-64 bg-muted rounded-xl animate-pulse" />;
  return (
    <div className="h-64 rounded-xl overflow-hidden">
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
