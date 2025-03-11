import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";

const DEFAULT_PASSWORD = "brf-docenten-2024";

const authSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string(),
});

type AuthForm = z.infer<typeof authSchema>;

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: DEFAULT_PASSWORD,
    },
  });

  const onSubmit = async (data: AuthForm) => {
    try {
      const endpoint = isRegistering ? "/api/register" : "/api/login";
      const response = await apiRequest("POST", endpoint, data);
      
      if (response.ok) {
        toast({
          title: "Välkommen!",
          description: isRegistering 
            ? "Ditt konto har skapats" 
            : "Du är nu inloggad",
        });
        setLocation("/profile");
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      toast({
        title: "Fel",
        description: error.message || "Något gick fel",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {isRegistering ? "Skapa konto" : "Logga in"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {isRegistering 
              ? "Registrera dig med din e-postadress" 
              : "Logga in med din e-postadress"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-post</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="namn@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lösenord</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        disabled 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {isRegistering ? "Skapa konto" : "Logga in"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsRegistering(!isRegistering)}
                >
                  {isRegistering 
                    ? "Har du redan ett konto? Logga in" 
                    : "Ny användare? Skapa konto"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
