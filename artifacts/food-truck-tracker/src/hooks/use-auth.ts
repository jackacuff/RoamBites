import { useGetMe, useLogin, useSignup, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch current user with retry disabled so it fails fast if not logged in
  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        // Save token for customFetch assuming it checks localStorage
        if (data.token) localStorage.setItem("token", data.token);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        // Redirect based on role
        if (data.user.role === 'superadmin') setLocation('/superadmin');
        else if (data.user.role === 'admin') setLocation('/admin');
        else if (data.user.role === 'vendor') setLocation('/vendor');
        else if (data.user.role === 'organizer') setLocation('/organizer');
        else setLocation('/');
      }
    }
  });

  const signupMutation = useSignup({
    mutation: {
      onSuccess: (data) => {
        if (data.token) localStorage.setItem("token", data.token);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        if (data.user.role === 'vendor') setLocation('/vendor');
        else if (data.user.role === 'organizer') setLocation('/organizer');
        else setLocation('/');
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        localStorage.removeItem("token");
        queryClient.clear();
        setLocation('/login');
      }
    }
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    signup: signupMutation.mutateAsync,
    isSigningUp: signupMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
