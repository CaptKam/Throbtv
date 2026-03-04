import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import Discover from "@/pages/Discover";
import NotFound from "@/pages/not-found";
import { GlobalMiniPlayer } from "@/components/layout/GlobalMiniPlayer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/discover" component={Discover} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <GlobalMiniPlayer />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

