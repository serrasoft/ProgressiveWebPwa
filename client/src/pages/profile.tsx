import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2, Save, Trash2 } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const profileSchema = z.object({
  displayName: z.string().min(1, "Namn måste anges"),
  apartmentNumber: z.string()
    .refine(val => !val || (Number(val) >= 1 && Number(val) <= 165), 
      "Lägenhetsnummer måste vara mellan 1 och 165"),
  port: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string>("");

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      apartmentNumber: "",
      port: "",
      phoneNumber: "",
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      // Save profile data both online and offline
      const offlineData = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };

      // Save offline first
      localStorage.setItem('profileData', JSON.stringify(offlineData));

      // Then try to save online
      await apiRequest("PATCH", "/api/profile", data);

      toast({
        title: "Klart",
        description: "Din profil har uppdaterats",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: "Fel",
        description: "Det gick inte att spara profilen",
        variant: "destructive",
      });
    }
  };

  // Function to delete the account
  const deleteAccount = async () => {
    try {
      setIsDeleting(true);
      await apiRequest("DELETE", "/api/account");
      
      // Clear local storage data
      localStorage.removeItem('profileData');
      localStorage.removeItem('offlineAuth');
      
      // Show success message
      toast({
        title: "Konto raderat",
        description: "Ditt konto och alla uppgifter har raderats",
      });
      
      // Invalidate queries to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Logout and redirect to auth page
      logoutMutation.mutate();
      setLocation("/auth");
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Fel",
        description: "Det gick inte att radera kontot",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Load saved profile data when component mounts
  useEffect(() => {
    try {
      // Try to load offline data first
      const savedData = localStorage.getItem('profileData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        form.reset(parsedData);
      }

      // Then try to fetch online data
      apiRequest("GET", "/api/profile")
        .then(response => response.json())
        .then(data => {
          // Store email separately
          if (data.email) {
            setEmail(data.email);
          }
          
          form.reset(data);
          // Update offline storage with latest online data
          localStorage.setItem('profileData', JSON.stringify({
            ...data,
            lastUpdated: new Date().toISOString(),
          }));
        })
        .catch(console.error);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Profil</h1>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <Save className="h-5 w-5" />
          ) : (
            <Edit2 className="h-5 w-5" />
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Namn</FormLabel>
                      <FormControl>
                        <Input placeholder="ditt namn" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apartmentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HSB lägenhetsnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="nummer skall vara mellan 1 och 165" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input placeholder="portnummer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefonnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="exempelvis mobilnummer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Spara
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">E-post</h3>
                <p className="text-sm text-muted-foreground">
                  {email || "Ej tillgänglig"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Namn</h3>
                <p className="text-sm text-muted-foreground">
                  {form.watch("displayName") || "Ej angivet"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">HSB lägenhetsnummer</h3>
                <p className="text-sm text-muted-foreground">
                  {form.watch("apartmentNumber") || "Ej angivet"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Port</h3>
                <p className="text-sm text-muted-foreground">
                  {form.watch("port") || "Ej angivet"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Telefonnummer</h3>
                <p className="text-sm text-muted-foreground">
                  {form.watch("phoneNumber") || "Ej angivet"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="border-t pt-6">
          <div className="w-full">
            <h3 className="font-medium mb-2">Kontoinställningar</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Radera konto och data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Denna åtgärd kan inte ångras. Ditt konto och all tillhörande data kommer att raderas permanent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={deleteAccount} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Ja, radera mitt konto
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">
              Detta raderar alla dina uppgifter permanent i enlighet med GDPR.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}