import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

// Lazy load heavy pages — keeps initial bundle small
const Discover = lazy(() => import("@/pages/Discover"));
const Theater = lazy(() => import("@/pages/Theater"));
const Remote = lazy(() => import("@/pages/Remote"));
const Legal = lazy(() => import("@/pages/Legal"));

function Router() {
  return (
    <Suspense fallback={<div style={{ background: "#000", width: "100vw", height: "100vh" }} />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/discover" component={Discover} />
        <Route path="/theater" component={Theater} />
        <Route path="/remote/:sessionCode" component={Remote} />
        <Route path="/legal/:page" component={Legal} />
        <Route path="/legal">{() => { window.location.replace("/legal/terms"); return null; }}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
