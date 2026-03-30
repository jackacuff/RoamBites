import { Link } from "wouter";
import { MapPin, ArrowRight, Star } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { TruckSummary } from "@workspace/api-client-react";

interface TruckCardProps {
  truck: TruckSummary;
}

export function TruckCard({ truck }: TruckCardProps) {
  const fallbackImg = `${import.meta.env.BASE_URL}images/truck-placeholder.png`;

  return (
    <Link 
      href={`/trucks/${truck.id}`}
      className="group flex flex-row sm:flex-col bg-card rounded-2xl sm:rounded-3xl overflow-hidden shadow-md shadow-primary/5 border border-border/60 hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image — strip on mobile, tall on desktop */}
      <div className="w-28 shrink-0 sm:w-full sm:aspect-[4/3] overflow-hidden bg-muted relative self-stretch">
        <img 
          src={truck.imageUrl || fallbackImg} 
          alt={truck.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <StatusBadge status={truck.status} isLive={truck.isLive} />
        </div>
      </div>
      
      <div className="p-3 sm:p-6 flex flex-col flex-1 min-w-0 relative bg-card">
        <div className="flex justify-between items-start mb-1 sm:mb-3 gap-1.5">
          <h3 className="text-base sm:text-xl font-display font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
            {truck.name}
          </h3>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary-foreground whitespace-nowrap shrink-0">
            {truck.cuisine}
          </span>
        </div>

        <span className="sm:hidden text-xs font-medium text-secondary-foreground bg-secondary/20 rounded-full px-2 py-0.5 w-fit mb-1.5">
          {truck.cuisine}
        </span>
        
        <p className="hidden sm:block text-muted-foreground text-sm flex-1 line-clamp-2 leading-relaxed">
          {truck.description || `Delicious ${truck.cuisine} food truck serving the local area.`}
        </p>
        
        <div className="mt-auto pt-2 sm:mt-6 sm:pt-4 sm:border-t sm:border-border/50 flex items-center justify-between">
          <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-primary shrink-0" />
            <span className="truncate max-w-[100px] sm:max-w-[120px]">
              {truck.currentCity || truck.activeSchedule?.city || "Various"}
            </span>
          </div>
          <div className="hidden sm:flex items-center text-sm font-semibold text-primary">
            View details <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
