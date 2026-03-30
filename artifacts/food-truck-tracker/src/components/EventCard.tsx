import { Link } from "wouter";
import { MapPin, Users, ExternalLink, Zap } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  event: {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    venueName: string;
    city: string;
    startDateTime: string | Date;
    endDateTime: string | Date;
    confirmedTruckCount: number;
    bannerImageUrl?: string | null;
    isFeatured?: boolean;
    websiteUrl?: string | null;
  };
  featured?: boolean;
}

const CITY_GRADIENTS: Record<string, string> = {
  "Oklahoma City": "from-orange-500 via-amber-400 to-yellow-300",
  "Edmond":        "from-sky-500 via-cyan-400 to-teal-300",
  "Norman":        "from-violet-500 via-purple-400 to-indigo-300",
  "Yukon":         "from-emerald-500 via-green-400 to-lime-300",
  "Moore":         "from-rose-500 via-pink-400 to-fuchsia-300",
};

function getGradient(city: string, name: string): string {
  if (CITY_GRADIENTS[city]) return CITY_GRADIENTS[city];
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradients = Object.values(CITY_GRADIENTS);
  return gradients[hash % gradients.length];
}

export default function EventCard({ event, featured }: EventCardProps) {
  const start = new Date(event.startDateTime);
  const end   = new Date(event.endDateTime);
  const now   = new Date();
  const isOngoing = start <= now && end >= now;
  const isPast    = end < now;
  const isFeatured = event.isFeatured || featured;
  const gradient = getGradient(event.city, event.name);

  return (
    <Link href={`/events/${event.id}`}>
      <div className={`group relative rounded-3xl overflow-hidden border transition-all duration-300 cursor-pointer h-full flex flex-col
        ${isFeatured
          ? "border-primary/50 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1"
          : "border-border hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
        }`}
      >
        {/* Banner */}
        <div className={`relative h-36 bg-gradient-to-br ${gradient} overflow-hidden`}>
          {event.bannerImageUrl && (
            <img src={event.bannerImageUrl} alt={event.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />
          )}

          {/* Date badge — top left */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-md text-center min-w-[52px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
              {format(start, "MMM")}
            </p>
            <p className="text-2xl font-black text-foreground leading-none">{format(start, "d")}</p>
          </div>

          {/* Featured badge — top right */}
          {isFeatured && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
              <Zap className="w-3 h-3 fill-current" />
              Featured
            </div>
          )}

          {/* Status badge — bottom right */}
          {isOngoing && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-bold shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Happening Now
            </div>
          )}
          {isPast && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-semibold backdrop-blur-sm">
              Past Event
            </div>
          )}

          {/* Gradient fade to card bg */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-4 bg-card">
          <h3 className="font-display font-bold text-foreground text-base leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {event.name}
          </h3>

          {event.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1 leading-relaxed">{event.description}</p>
          )}

          <div className="mt-auto space-y-1.5 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground truncate">{event.venueName}, {event.city}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  {event.confirmedTruckCount > 0
                    ? `${event.confirmedTruckCount} truck${event.confirmedTruckCount !== 1 ? "s" : ""} confirmed`
                    : "Trucks TBA"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {format(start, "h:mm a")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
