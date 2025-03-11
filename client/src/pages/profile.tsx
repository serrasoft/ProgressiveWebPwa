import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Edit2, Save } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().min(1, "Namn måste anges"),
  apartmentNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      apartmentNumber: "",
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
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://github.com/shadcn.png" alt="Profilbild" />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{form.watch("displayName") || "Ej angivet"}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                        <Input placeholder="Ange ditt namn..." {...field} />
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
                      <FormLabel>Lägenhetsnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="T.ex. 1102..." {...field} />
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
                        <Input placeholder="T.ex. 0701234567..." {...field} />
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
                <h3 className="font-medium">Namn</h3>
                <p className="text-sm text-muted-foreground">
                  {form.watch("displayName") || "Ej angivet"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Lägenhetsnummer</h3>
                <p className="text-sm text-muted-foreground">
                  {form.watch("apartmentNumber") || "Ej angivet"}
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
      </Card>
    </div>
  );
}