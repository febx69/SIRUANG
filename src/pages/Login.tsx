// src/pages/Login.tsx
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import LoginForm from "@/components/Auth/LoginForm";
import { Navigate } from "react-router-dom";

const Login = () => {
  const { user, login, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Sudah login → langsung ke dashboard
  if (user) return <Navigate to="/" replace />;

  return <LoginForm onLogin={login} />;
};

export default Login;
