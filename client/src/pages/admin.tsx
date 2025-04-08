import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { isBadgingSupported, setAppBadge, clearAppBadge } from "@/lib/notifications";
import type { Notification } from "@shared/schema";
import { z } from "zod";
import { Trash2 } from "lucide-react";

const notificationSchema = z.object({
  title: z.string().min(1, "Titel måste anges"),
  body: z.string().min(1, "Meddelande måste anges"),
  link: z.string().optional(),
});

const loginSchema = z.object({
  password: z.string().min(1, "Lösenord måste anges"),
});

type NotificationForm = z.infer<typeof notificationSchema>;
type LoginForm = z.infer<typeof loginSchema>;

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, login, logout, resetAuth } = useAdminAuth();
  const [badgingSupported, setBadgingSupported] = useState(false);
  
  // Check for badging support
  useEffect(() => {
    setBadgingSupported(isBadgingSupported());
  }, []);

  const notificationForm = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      body: "",
      link: "",
    },
    mode: "onChange",
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: "",
    },
    mode: "onChange",
  });

  // Reset forms when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      notificationForm.reset({
        title: "",
        body: "",
        link: "",
      });
    } else {
      // Only reset login form if not authenticated
      loginForm.reset({
        password: "",
      });
    }
  }, [isAuthenticated, notificationForm, loginForm]);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: async () => {
      // Fetch new notifications count after deletion
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // Update the app badge if supported
      if (badgingSupported) {
        try {
          // Get the updated notifications count
          const response = await fetch("/api/notifications");
          const notificationsData = await response.json();
          const notificationsCount = Array.isArray(notificationsData) ? notificationsData.length : 0;
          
          // Update badge with new count, or clear if zero
          if (notificationsCount > 0) {
            await setAppBadge(notificationsCount);
            console.log(`App badge updated to ${notificationsCount}`);
          } else {
            await clearAppBadge();
            console.log('App badge cleared');
          }
        } catch (badgeError) {
          console.error('Failed to update app badge:', badgeError);
        }
      }
      
      toast({
        title: "Klart",
        description: "Notisen har tagits bort",
      });
    },
    onError: (error) => {
      toast({
        title: "Fel",
        description: "Det gick inte att ta bort notisen",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: NotificationForm) => {
    try {
      // Send the notification
      await apiRequest("POST", "/api/notifications/send", data);
      
      // Get latest notifications count to update badge
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // Get the current notifications
      const response = await fetch("/api/notifications");
      const notificationsData = await response.json();
      const notificationsCount = Array.isArray(notificationsData) ? notificationsData.length : 0;
      
      // Update the app badge if supported
      if (badgingSupported && notificationsCount > 0) {
        try {
          await setAppBadge(notificationsCount);
          console.log(`App badge set to ${notificationsCount}`);
        } catch (badgeError) {
          console.error('Failed to set app badge:', badgeError);
        }
      }
      
      // Reset the form
      notificationForm.reset({
        title: "",
        body: "",
        link: "",
      });
      
      toast({
        title: "Klart",
        description: "Notisen har skickats",
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast({
        title: "Fel",
        description: "Det gick inte att skicka notisen",
        variant: "destructive",
      });
    }
  };

  const onLogin = (data: LoginForm) => {
    const success = login(data.password);
    
    // Always reset the form to clear the password field
    loginForm.reset();
    
    if (success) {
      toast({
        title: "Välkommen",
        description: "Du är nu inloggad som administratör",
      });
    } else {
      toast({
        title: "Fel",
        description: "Felaktigt lösenord",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin - Logga in</h1>
        <Card>
          <CardHeader>
            <CardTitle>Logga in som administratör</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form key="login-form" onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lösenord</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Ange lösenord..." 
                          autoComplete="current-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between items-center gap-2">
                  <Button type="submit" disabled={loginForm.formState.isSubmitting}>
                    Logga in
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      resetAuth();
                      toast({
                        title: "Återställd",
                        description: "Inloggningsstatus har återställts",
                      });
                    }}
                  >
                    Återställ inloggning
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin - Hantera notiser</h1>
        <Button variant="outline" onClick={logout}>Logga ut</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skapa ny notis</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...notificationForm}>
            <form key="notification-form" onSubmit={notificationForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={notificationForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel</FormLabel>
                    <FormControl>
                      <Input placeholder="Ange titel..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={notificationForm.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meddelande</FormLabel>
                    <FormControl>
                      <Input placeholder="Ange meddelande..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={notificationForm.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Länk (valfritt)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={notificationForm.formState.isSubmitting}>
                Skicka notis
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tidigare notiser</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga notiser att visa</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className="flex justify-between p-3 rounded-lg bg-accent"
                >
                  <div className="flex-grow mr-4">
                    <p className="font-medium">{notification.title}</p>
                    {notification.body && (
                      <p className="text-sm mt-1">{notification.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString('sv-SE')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {notification.link && (
                      <a
                        href={notification.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        Öppna länk
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification.mutate(notification.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}