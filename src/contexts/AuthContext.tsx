import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  onboarding_completed: boolean;
  id_verified: boolean;
}

interface UserRole {
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  isLoading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  needsOnboarding: boolean;
  getDefaultRoute: () => string;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthProvider] Auth state changed:', event, 'user:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfileAndRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] Initial session check:', session?.user?.email || 'no session');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfileAndRoles(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndRoles = async (userId: string) => {
    try {
      const [profileData, rolesData] = await Promise.all([
        supabase.from('profiles')
          .select('id, first_name, last_name, avatar_url, date_of_birth, onboarding_completed, id_verified')
          .eq('id', userId)
          .single(),
        supabase.from('user_roles').select('role').eq('user_id', userId)
      ]);

      if (profileData.data) setProfile(profileData.data);
      if (rolesData.data) setRoles(rolesData.data.map((r: UserRole) => r.role));
    } catch (error) {
      console.error('Error fetching profile/roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, date_of_birth, onboarding_completed, id_verified')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const signInWithOtp = async (email: string) => {
    console.log('Requesting OTP for email:', email);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    });
    console.log('OTP request response:', { data, error });
    return { error };
  };

  const verifyOtp = async (email: string, token: string) => {
    console.log('Verifying OTP:', { email, tokenLength: token.length });
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
    console.log('OTP verification response:', { data, error });
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const hasRole = (role: string) => roles.includes(role);

  const needsOnboarding = profile ? !profile.onboarding_completed : false;

  const getDefaultRoute = () => {
    if (hasRole('organization')) return '/organization/dashboard';
    return '/';
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    isLoading,
    signInWithOtp,
    verifyOtp,
    signInWithGoogle,
    signOut,
    hasRole,
    needsOnboarding,
    getDefaultRoute,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
