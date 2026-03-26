import { Link } from "wouter";
import { Calendar, MapPin, Users } from "lucide-react";
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
  };
}

export default function EventCard({ event }: EventCardProps) {
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  const now = new Date();
  const isOngoing = start <= now && end >= now;
  const isPast = end < now;

  return (
    <Link href={`/events/${event.id}`}>
      <div className="bg-card border border-card-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-foreground leading-tight">{event.name}</h3>
          {isOngoing && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Now
            </span>
          )}
          {isPast && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">Past</span>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{event.description}</p>
        )}

        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{format(start, "MMM d, yyyy")} · {format(start, "h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{event.venueName}, {event.city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 shrink-0" />
            <span>{event.confirmedTruckCount} truck{event.confirmedTruckCount !== 1 ? 's' : ''} confirmed</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
