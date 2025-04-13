import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

// Registration form schema
const registerSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
  confirmPassword: z.string(),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: "Du måste godkänna hantering av personuppgifter"
  })
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: "Lösenorden matchar inte",
    path: ["confirmPassword"]
  }
);

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(1, "Lösenord måste anges"),
});

// Verification form schema
const verifySchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  code: z.string().length(4, "Koden måste vara 4 siffror")
});

type RegisterForm = z.infer<typeof registerSchema>;
type LoginForm = z.infer<typeof loginSchema>;
type VerifyForm = z.infer<typeof verifySchema>;

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [emailToVerify, setEmailToVerify] = useState<string>("");
  const [, setLocation] = useLocation();
  const { 
    user, 
    loginMutation, 
    registerMutation, 
    verifyMutation, 
    resendVerificationMutation 
  } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Register form
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      gdprConsent: false
    },
  });

  // Login form
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Verification form
  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: emailToVerify,
      code: "",
    },
  });

  // Update verification form when email changes
  useEffect(() => {
    verifyForm.setValue("email", emailToVerify);
  }, [emailToVerify, verifyForm]);

  // Handle registration
  const onRegister = async (data: RegisterForm) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        setEmailToVerify(data.email);
        setMode("verify");
      }
    });
  };

  // Handle login
  const onLogin = async (data: LoginForm) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        // Store credentials for offline use
        localStorage.setItem('offlineAuth', JSON.stringify({
          email: data.email,
          timestamp: new Date().toISOString()
        }));
        setLocation("/");
      },
      onError: (error: any) => {
        // Handle needs verification error
        if (error.status === 400 && error.data?.needsVerification) {
          setEmailToVerify(data.email);
          setMode("verify");
        }
      }
    });
  };

  // Handle verification
  const onVerify = async (data: VerifyForm) => {
    verifyMutation.mutate(data, {
      onSuccess: () => {
        // Store credentials for offline use
        localStorage.setItem('offlineAuth', JSON.stringify({
          email: data.email,
          timestamp: new Date().toISOString()
        }));
        setLocation("/");
      }
    });
  };

  // Handle resend verification code
  const onResendCode = () => {
    if (emailToVerify) {
      resendVerificationMutation.mutate({ email: emailToVerify });
    }
  };

  if (user) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:max-w-xl">
      <div className="flex flex-col space-y-4 md:space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            {mode === "login" && "Välkommen tillbaka!"}
            {mode === "register" && "Skapa ett nytt konto"}
            {mode === "verify" && "Verifiera din e-post"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "login" && "Logga in för att använda BRF Docentens bostadsapp"}
            {mode === "register" && "Fyll i dina uppgifter för att komma igång"}
            {mode === "verify" && "Kontrollera din e-post för verifieringskod"}
          </p>
        </div>

        {/* Auth card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">
              {mode === "login" && "Logga in"}
              {mode === "register" && "Skapa konto"}
              {mode === "verify" && "Verifiera e-post"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Ange din e-post och lösenord för att logga in"}
              {mode === "register" && "Registrera dig med din e-postadress"}
              {mode === "verify" && "Ange 4-siffrig kod från e-postmeddelandet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "login" && (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-post</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="din@epost.se" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lösenord</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : "Logga in"}
                  </Button>
                </form>
              </Form>
            )}

            {mode === "register" && (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-post</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="din@epost.se" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lösenord</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bekräfta lösenord</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="gdprConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Jag godkänner att BRF Docenten behandlar mina personuppgifter
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Dina uppgifter används endast för att tillhandahålla tjänsten och kommer inte att delas med tredje part. 
                            Du kan när som helst begära att få dina uppgifter raderade genom att kontakta föreningen.
                          </p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : "Skapa konto"}
                  </Button>
                </form>
              </Form>
            )}

            {mode === "verify" && (
              <Form {...verifyForm}>
                <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
                  <FormField
                    control={verifyForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-post</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field} 
                            disabled
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={verifyForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verifieringskod (4 siffror)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="1234" 
                            {...field} 
                            maxLength={4}
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
                      disabled={verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : "Verifiera konto"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={onResendCode}
                      disabled={resendVerificationMutation.isPending}
                    >
                      {resendVerificationMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : "Skicka ny kod"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Mode switcher */}
        {mode !== "verify" && (
          <div className="text-center">
            <Separator className="my-4" />
            {mode === "login" ? (
              <div className="text-sm text-center">
                <span className="text-muted-foreground">Har du inget konto? </span>
                <Button variant="link" className="p-0" onClick={() => setMode("register")}>
                  Registrera dig
                </Button>
              </div>
            ) : (
              <div className="text-sm text-center">
                <span className="text-muted-foreground">Har du redan ett konto? </span>
                <Button variant="link" className="p-0" onClick={() => setMode("login")}>
                  Logga in
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Return from verification */}
        {mode === "verify" && (
          <div className="text-center">
            <Button variant="link" onClick={() => setMode("login")}>
              Tillbaka till inloggning
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}