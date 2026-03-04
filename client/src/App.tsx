import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import Discover from "@/pages/Discover";
import Theater from "@/pages/Theater";
import Remote from "@/pages/Remote";
import Legal from "@/pages/Legal";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/discover" component={Discover} />
      <Route path="/theater" component={Theater} />
      <Route path="/remote/:sessionCode" component={Remote} />
      <Route path="/legal/:page" component={Legal} />
      <Route path="/legal">{() => { window.location.replace("/legal/terms"); return null; }}</Route>
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
