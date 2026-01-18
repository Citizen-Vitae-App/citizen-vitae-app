import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";

// Lazy-loaded pages for code splitting (including Index, Auth, NotFound for better initial load)
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const OrganizationOnboarding = lazy(() => import("./pages/OrganizationOnboarding"));
const OrganizationDashboard = lazy(() => import("./pages/OrganizationDashboard"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const OrganizationPublic = lazy(() => import("./pages/OrganizationPublic"));
const OrganizationPastEvents = lazy(() => import("./pages/OrganizationPastEvents"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Favorites = lazy(() => import("./pages/Favorites"));
const MyMissions = lazy(() => import("./pages/MyMissions"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ScanParticipant = lazy(() => import("./pages/ScanParticipant"));
const VerifyParticipant = lazy(() => import("./pages/VerifyParticipant"));
const Certificate = lazy(() => import("./pages/Certificate"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/events/:eventId" element={<EventDetail />} />
                <Route path="/organization/:orgId" element={<OrganizationPublic />} />
                <Route path="/organization/:orgId/past-events" element={<OrganizationPastEvents />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
                <Route path="/organization/onboarding" element={<ProtectedRoute requireOnboarding={false}><OrganizationOnboarding /></ProtectedRoute>} />
                <Route path="/organization/dashboard" element={<ProtectedRoute requiredRole="organization"><OrganizationDashboard /></ProtectedRoute>} />
                <Route path="/organization/settings" element={<ProtectedRoute requiredRole="organization"><OrganizationSettings /></ProtectedRoute>} />
                <Route path="/organization/create-event" element={<ProtectedRoute requiredRole="organization"><CreateEvent /></ProtectedRoute>} />
                <Route path="/organization/events/:eventId/edit" element={<ProtectedRoute requiredRole="organization"><EditEvent /></ProtectedRoute>} />
                <Route path="/organization/scan" element={<ProtectedRoute requiredRole="organization"><ScanParticipant /></ProtectedRoute>} />
                <Route path="/organization/scan/:eventId" element={<ProtectedRoute requiredRole="organization"><ScanParticipant /></ProtectedRoute>} />
                <Route path="/admin" element={<Navigate to="/super-admin" replace />} />
                <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/my-missions" element={<ProtectedRoute><MyMissions /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/verify/:registrationId" element={<VerifyParticipant />} />
                <Route path="/certificate/:certificateId" element={<Certificate />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
