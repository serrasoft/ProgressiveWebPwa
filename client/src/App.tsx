import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import MobileLayout from "./components/layouts/mobile-layout";
import { ProtectedRoute } from "./lib/protected-route";
import Home from "./pages/home";
import Notifications from "./pages/notifications";
import Profile from "./pages/profile";
import Settings from "./pages/settings";
import Browser from "./pages/browser";
import Admin from "./pages/admin";
import Auth from "./pages/auth";
import NotFound from "./pages/not-found";
import React from "react";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./components/theme-provider";

function Router() {
  return (
    <MobileLayout>
      <Switch>
        <Route path="/" component={Home} />
        <ProtectedRoute path="/notifications" component={Notifications} />
        <ProtectedRoute path="/profile" component={Profile} />
        <ProtectedRoute path="/settings" component={Settings} />
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
      <ThemeProvider defaultTheme="system">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}