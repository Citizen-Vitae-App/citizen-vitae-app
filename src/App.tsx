import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VerifyOtp from "./pages/VerifyOtp";
import Onboarding from "./pages/Onboarding";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import OrganizationSettings from "./pages/OrganizationSettings";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import EventDetail from "./pages/EventDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import MyMissions from "./pages/MyMissions";
import Notifications from "./pages/Notifications";
import ScanParticipant from "./pages/ScanParticipant";
import VerifyParticipant from "./pages/VerifyParticipant";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
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
            <Route path="/organization/settings" element={<ProtectedRoute requiredRole="organization"><OrganizationSettings /></ProtectedRoute>} />
            <Route path="/organization/create-event" element={<ProtectedRoute requiredRole="organization"><CreateEvent /></ProtectedRoute>} />
            <Route path="/organization/events/:eventId/edit" element={<ProtectedRoute requiredRole="organization"><EditEvent /></ProtectedRoute>} />
            <Route path="/organization/scan" element={<ProtectedRoute requiredRole="organization"><ScanParticipant /></ProtectedRoute>} />
            <Route path="/organization/scan/:eventId" element={<ProtectedRoute requiredRole="organization"><ScanParticipant /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="super_admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            <Route path="/my-missions" element={<ProtectedRoute><MyMissions /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/verify/:registrationId" element={<VerifyParticipant />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
