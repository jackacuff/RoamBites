import { useState } from "react";
import { Link } from "wouter";
import { useListEvents } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import EventCard from "@/components/EventCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";

export default function Events() {
  const [upcoming, setUpcoming] = useState(true);
  const { data: events, isLoading } = useListEvents({ upcoming: upcoming ? true : undefined });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Food Truck Events</h1>
            <p className="text-muted-foreground mt-1">Community gatherings featuring Central Oklahoma's best food trucks</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setUpcoming(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${upcoming ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setUpcoming(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!upcoming ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              All Events
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No events found"
            description="Check back soon for upcoming food truck events in Central Oklahoma."
          />
        )}
      </div>
    </Layout>
  );
}
