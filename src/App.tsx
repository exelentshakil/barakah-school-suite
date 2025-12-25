import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Admission from "./pages/Admission";
import Fees from "./pages/Fees";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path="/admission" element={<ProtectedRoute><Admission /></ProtectedRoute>} />
      <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/id-cards" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/sms" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
