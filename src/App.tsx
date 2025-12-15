import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VerifyOtp from "./pages/VerifyOtp";
import Onboarding from "./pages/Onboarding";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import EventDetail from "./pages/EventDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Favorites from "./pages/Favorites";
import MyMissions from "./pages/MyMissions";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/events/:eventId" element={<EventDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
          <Route path="/organization/dashboard" element={<ProtectedRoute requiredRole="organization"><OrganizationDashboard /></ProtectedRoute>} />
          <Route path="/organization/create-event" element={<ProtectedRoute requiredRole="organization"><CreateEvent /></ProtectedRoute>} />
          <Route path="/organization/events/:eventId/edit" element={<ProtectedRoute requiredRole="organization"><EditEvent /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="super_admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/my-missions" element={<ProtectedRoute><MyMissions /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
