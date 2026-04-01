import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "./pages/Home";
import Trucks from "./pages/Trucks";
import TruckDetail from "./pages/TruckDetail";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorTruck from "./pages/vendor/VendorTruck";
import VendorMenu from "./pages/vendor/VendorMenu";
import VendorSchedule from "./pages/vendor/VendorSchedule";
import VendorEvents from "./pages/vendor/VendorEvents";
import VendorBranding from "./pages/vendor/VendorBranding";

import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerNewEvent from "./pages/organizer/OrganizerNewEvent";
import OrganizerManageEvent from "./pages/organizer/OrganizerManageEvent";
import OrganizerEditEvent from "./pages/organizer/OrganizerEditEvent";

import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import VendorTruckEdit from "./pages/vendor/VendorTruckEdit";
import VendorSpecials from "./pages/vendor/VendorSpecials";
import VendorEventSpots from "./pages/vendor/VendorEventSpots";
import VendorInbox from "./pages/vendor/VendorInbox";
import VendorMarketing from "./pages/vendor/VendorMarketing";
import VendorAnalytics from "./pages/vendor/VendorAnalytics";
import OrganizerTruckMarketplace from "./pages/organizer/OrganizerTruckMarketplace";
import OrganizerConnectReturn from "./pages/organizer/OrganizerConnectReturn";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Parks from "./pages/Parks";
import ParkDetail from "./pages/ParkDetail";
import ParkHostDashboard from "./pages/park-host/ParkHostDashboard";
import Pricing from "./pages/Pricing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trucks" component={Trucks} />
      <Route path="/trucks/:id" component={TruckDetail} />
      <Route path="/events" component={Events} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      <Route path="/vendor" component={VendorDashboard} />
      <Route path="/vendor/dashboard" component={VendorDashboard} />
      <Route path="/vendor/truck/edit" component={VendorTruckEdit} />
      <Route path="/vendor/truck" component={VendorTruck} />
      <Route path="/vendor/menu" component={VendorMenu} />
      <Route path="/vendor/schedule" component={VendorSchedule} />
      <Route path="/vendor/events" component={VendorEvents} />
      <Route path="/vendor/branding" component={VendorBranding} />
      <Route path="/vendor/specials" component={VendorSpecials} />
      <Route path="/vendor/event-spots" component={VendorEventSpots} />
      <Route path="/vendor/inbox" component={VendorInbox} />
      <Route path="/vendor/marketing" component={VendorMarketing} />
      <Route path="/vendor/analytics" component={VendorAnalytics} />
      <Route path="/organizer/trucks" component={OrganizerTruckMarketplace} />

      <Route path="/organizer" component={OrganizerDashboard} />
      <Route path="/organizer/events/new" component={OrganizerNewEvent} />
      <Route path="/organizer/events/:id/manage" component={OrganizerManageEvent} />
      <Route path="/organizer/events/:id/edit" component={OrganizerEditEvent} />
      <Route path="/organizer/connect/return" component={OrganizerConnectReturn} />

      <Route path="/parks" component={Parks} />
      <Route path="/parks/:id" component={ParkDetail} />
      <Route path="/park-host" component={ParkHostDashboard} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/superadmin" component={SuperAdminDashboard} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/profile" component={Profile} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
