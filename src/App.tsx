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
import Attendance from "./pages/Attendance";
import Exams from "@/pages/Exams.tsx";
import IDCards from "@/pages/IDCards.tsx";
import Certificates from "@/pages/Certificates.tsx";
import SMS from "@/pages/SMS.tsx";
import Reports from "@/pages/Reports.tsx";
import SettingsPage from "@/pages/Settings.tsx";
import MarksEntry from "@/pages/MarksEntry.tsx";
import ReportCards from "@/pages/ReportCards.tsx";
import Marks from "@/pages/Marks.tsx";
import Verify from "@/pages/Verify.tsx";
import VerifyCertificate from "@/pages/VerifyCertificate.tsx";
import PromoteStudents from "@/pages/PromoteStudents.tsx";
import StudentDetail from "@/pages/StudentDetail.tsx";
import SMSPaymentFail from "@/pages/SMSPaymentFail.tsx";
import SMSPaymentCancel from "@/pages/SMSPaymentCancel.tsx";
import ReceiptView from "@/pages/ReceiptView.tsx";
import AccountingPage from "@/pages/AccountingPage.tsx";
import AdmitCards from "@/pages/AdmitCards.tsx";
import VerifyAdmitCard from "@/pages/VerifyAdmitCard.tsx";

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

function SMSPaymentSuccess() {
    return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
        <Route path="/id-cards" element={<ProtectedRoute><IDCards /></ProtectedRoute>} />
      <Route path="/admission" element={<ProtectedRoute><Admission /></ProtectedRoute>} />
      <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
      <Route path="/sms" element={<ProtectedRoute><SMS /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/marks" element={<ProtectedRoute><Marks /></ProtectedRoute>} />
        <Route path="/report-cards/:examId" element={<ProtectedRoute><ReportCards /></ProtectedRoute>} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify-certificate" element={<VerifyCertificate />} />
        <Route path="/verify-admit-card" element={<VerifyAdmitCard />} />
        <Route path="/promote-students" element={<ProtectedRoute><PromoteStudents /></ProtectedRoute>} />
        <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
        <Route path="/receipt/:id" element={<ProtectedRoute><ReceiptView /></ProtectedRoute>} />

        <Route path="/sms-payment-success" element={<SMSPaymentSuccess />} />
        <Route path="/sms-payment-fail" element={<SMSPaymentFail />} />
        <Route path="/sms-payment-cancel" element={<SMSPaymentCancel />} />
        <Route path="/admit-cards" element={<ProtectedRoute><AdmitCards /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />

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
