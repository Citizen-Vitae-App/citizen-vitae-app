// Re-export the auth context hook for backward compatibility
// This allows existing code using useAuth() to continue working
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
