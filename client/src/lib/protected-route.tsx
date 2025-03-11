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
    fetch("/api/profile")
      .then(res => {
        if (!res.ok) {
          setLocation("/auth");
        }
      })
      .catch(() => setLocation("/auth"));
  }, [setLocation]);

  return <Component {...props} />;
}
