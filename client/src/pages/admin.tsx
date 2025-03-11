import React from "react";
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
  const { isAuthenticated, login, logout } = useAdminAuth();

  // Separate form for notifications
  const notificationForm = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      body: "",
      link: "",
    },
  });

  // Separate form for login
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: "",
    },
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Klart",
        description: "Notisen har tagits bort",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
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
      await apiRequest("POST", "/api/notifications/send", data);
      toast({
        title: "Klart",
        description: "Notisen har skickats",
      });
      notificationForm.reset({
        title: "",
        body: "",
        link: "",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
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
    if (login(data.password)) {
      toast({
        title: "Välkommen",
        description: "Du är nu inloggad som administratör",
      });
      loginForm.reset();
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
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
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
                <Button type="submit" disabled={loginForm.formState.isSubmitting}>
                  Logga in
                </Button>
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
            <form onSubmit={notificationForm.handleSubmit(onSubmit)} className="space-y-4">
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
                  className="flex items-center justify-between p-3 rounded-lg bg-accent"
                >
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString('sv-SE')}
                    </p>
                  </div>
                  <div className="flex gap-2">
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