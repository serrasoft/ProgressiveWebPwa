import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, RegisterUser, ValidatedRegisterUser, VerifyUser, LoginUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginUser>;
  logoutMutation: UseMutationResult<any, Error, void>;
  registerMutation: UseMutationResult<any, Error, ValidatedRegisterUser>;
  verifyMutation: UseMutationResult<any, Error, VerifyUser>;
  resendVerificationMutation: UseMutationResult<any, Error, { email: string }>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Inloggning lyckades",
        description: "Du är nu inloggad",
      });
    },
    onError: (error: Error) => {
      // Don't show a toast for verification errors as those are handled in the auth.tsx component
      const errorMessage = error.message || "";
      if (!errorMessage.includes("Kontot är inte verifierat")) {
        toast({
          title: "Inloggning misslyckades",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: ValidatedRegisterUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registrering lyckades",
        description: data.message || "Kontrollera din e-post för verifieringskod",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registrering misslyckades",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (verificationData: VerifyUser) => {
      const res = await apiRequest("POST", "/api/verify", verificationData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Verifiering lyckades",
        description: data.message || "Ditt konto är nu verifierat",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verifiering misslyckades",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/resend-verification", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ny verifieringskod skickad",
        description: data.message || "Kontrollera din e-post för den nya koden",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Kunde inte skicka ny kod",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/profile"], null);
      toast({
        title: "Utloggning lyckades",
        description: "Du är nu utloggad",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Utloggning misslyckades",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        verifyMutation,
        resendVerificationMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}