import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import MobileLayout from "./components/layouts/mobile-layout";
import Home from "./pages/home";
import Notifications from "./pages/notifications";
import Profile from "./pages/profile";
import Settings from "./pages/settings";
import Browser from "./pages/browser";
import Admin from "./pages/admin";
import Auth from "./pages/auth";
import NotFound from "./pages/not-found";
import React from "react";

function Router() {
  return (
    <MobileLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/browser" component={Browser} />
        <Route path="/admin" component={Admin} />
        <Route path="/auth" component={Auth} />
        <Route component={NotFound} />
      </Switch>
    </MobileLayout>
  );
}

export default function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </React.StrictMode>
  );
}