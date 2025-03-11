import { useLocation } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  component: Component,
  ...props
}: {
  component: React.ComponentType;
  [key: string]: any;
}) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is authenticated by trying to fetch profile
    fetch("/api/profile", {
      credentials: 'include' // Important for session cookies
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .catch(() => {
        // If there's an error or unauthorized, redirect to auth
        setLocation("/auth");
      });
  }, [setLocation]);

  return <Component {...props} />;
}