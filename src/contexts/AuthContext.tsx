import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { queryClient } from '@/lib/queryClient';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  onboarding_completed: boolean;
  id_verified: boolean;
  verification_status: string | null;
  didit_session_id: string | null;
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
  const [invitationsHandled, setInvitationsHandled] = useState<Set<string>>(new Set()); // ✅ Flag pour éviter les appels multiples
  const [isFetchingProfile, setIsFetchingProfile] = useState(false); // 🚀 Évite les appels dupliqués
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.info('AuthProvider', 'Auth state changed:', event, 'user:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfileAndRoles(session.user.id);
          }, 0);
        } else {
          // ✅ Bug fix: Vider le Set invitationsHandled lors de la déconnexion
          setInvitationsHandled(new Set());
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.info('AuthProvider', 'Initial session check:', session?.user?.email || 'no session');
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
    // 🚀 Éviter les appels dupliqués si déjà en cours de fetch
    if (isFetchingProfile) {
      logger.debug('AuthProvider', 'Fetch already in progress, skipping duplicate call');
      return;
    }

    setIsFetchingProfile(true);
    
    try {
      // 🎯 Utiliser le cache React Query pour éviter les appels dupliqués
      const [profileData, rolesData] = await Promise.all([
        // Profile avec cache React Query
        queryClient.fetchQuery({
          queryKey: ['profile', userId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url, date_of_birth, onboarding_completed, id_verified, verification_status, didit_session_id')
              .eq('id', userId)
              .maybeSingle();
            
            if (error) throw error;
            return data;
          },
          staleTime: 5 * 60 * 1000, // 5 minutes de cache
        }),
        // Roles avec cache React Query
        queryClient.fetchQuery({
          queryKey: ['user_roles', userId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId);
            
            if (error) throw error;
            return data || [];
          },
          staleTime: 5 * 60 * 1000, // 5 minutes de cache
        }),
      ]);

      let profile = profileData;

      // If no profile exists, create it (this handles the missing profile bug)
      if (!profile) {
        logger.info('AuthProvider', 'No profile found for user, creating one...');
        const { data: userData } = await supabase.auth.getUser();
        const userEmail = userData?.user?.email;
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            onboarding_completed: false,
          })
          .select('id, first_name, last_name, avatar_url, date_of_birth, onboarding_completed, id_verified, verification_status, didit_session_id')
          .single();

        if (insertError) {
          logger.error('[AuthProvider] Error creating profile:', insertError);
        } else {
          profile = newProfile;
          logger.info('AuthProvider', 'Profile created successfully');
          
          // Mettre à jour le cache avec le nouveau profil
          queryClient.setQueryData(['profile', userId], newProfile);
        }
      }

      // Also create user_preferences if missing (avec cache)
      if (profile) {
        const prefsExist = await queryClient.fetchQuery({
          queryKey: ['user_preferences', userId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('user_preferences')
              .select('user_id')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (error) throw error;
            return data;
          },
          staleTime: 5 * 60 * 1000, // 5 minutes de cache
        });

        if (!prefsExist) {
          const { data: newPrefs } = await supabase.from('user_preferences').insert({
            user_id: userId,
            language: 'fr',
            email_opt_in: true,
            sms_opt_in: false,
            geolocation_enabled: false,
          }).select().single();
          
          // Mettre à jour le cache avec les nouvelles préférences
          if (newPrefs) {
            queryClient.setQueryData(['user_preferences', userId], newPrefs);
          }
        }
      }

      // Mettre à jour les states locaux
      if (profile) setProfile(profile);
      if (rolesData) setRoles(rolesData.map((r: UserRole) => r.role));

      // After setting profile, handle pending invitations (une seule fois par user)
      if (profile && !invitationsHandled.has(userId)) {
        await handlePendingInvitations(userId, profile);
        setInvitationsHandled(prev => new Set(prev).add(userId));
      }
    } catch (error) {
      logger.error('Error fetching profile/roles:', error);
    } finally {
      setIsLoading(false);
      setIsFetchingProfile(false); // 🚀 Libérer le flag
    }
  };

  // Auto-accept pending invitations for the user's email
  const handlePendingInvitations = async (userId: string, profileData: Profile) => {
    try {
      // Get user email
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      if (!userEmail) return;

      // Find pending invitations for this email
      const { data: invitations, error: invError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .eq('status', 'pending');

      if (invError || !invitations || invitations.length === 0) return;

      logger.info('AuthProvider', 'Found pending invitations:', invitations.length);

      for (const inv of invitations) {
        // Check if user is already a member of this organization
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', inv.organization_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (existingMember) {
          logger.info('AuthProvider', 'User already member of org:', inv.organization_id);
          // Just mark invitation as accepted
          await supabase
            .from('organization_invitations')
            .update({ status: 'accepted', responded_at: new Date().toISOString() })
            .eq('id', inv.id);
          continue;
        }

        // Add user to organization
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: inv.organization_id,
            user_id: userId,
            role: inv.role || 'member',
            custom_role_title: inv.custom_role_title,
            is_owner: inv.invitation_type === 'owner',
          });

        if (memberError) {
          logger.error('[AuthProvider] Error adding member:', memberError);
          continue;
        }

        logger.info('AuthProvider', 'Added user to organization:', inv.organization_id);

        // Add to team if specified
        if (inv.team_id) {
          const { error: teamError } = await supabase
            .from('team_members')
            .insert({
              team_id: inv.team_id,
              user_id: userId,
              is_leader: false,
            });

          if (teamError) {
            logger.error('[AuthProvider] Error adding to team:', teamError);
          } else {
            logger.info('AuthProvider', 'Added user to team:', inv.team_id);
          }
        }

        // Mark invitation as accepted
        await supabase
          .from('organization_invitations')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', inv.id);

        logger.info('AuthProvider', 'Invitation accepted:', inv.id);
      }
    } catch (error) {
      logger.error('[AuthProvider] Error handling pending invitations:', error);
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    try {
      // 🎯 Invalider le cache et refetch depuis le serveur
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      const data = await queryClient.fetchQuery({
        queryKey: ['profile', user.id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, date_of_birth, onboarding_completed, id_verified, verification_status, didit_session_id')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes de cache
      });
      
      if (data) setProfile(data);
    } catch (error) {
      logger.error('Error refreshing profile:', error);
    }
  };

  const signInWithOtp = async (email: string) => {
    logger.debug('Requesting OTP for email:', email);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    });
    logger.debug('OTP request response:', { hasData: !!data, hasError: !!error });
    return { error };
  };

  const verifyOtp = async (email: string, token: string) => {
    // 1. Nettoyage préventif (Espaces, majuscules)
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    logger.debug('Verifying OTP (Attempt 1 - type: email):', { email: cleanEmail });

    // 2. Première tentative : Mode "Connexion Standard"
    let result = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email'
    });

    // 3. Si ça échoue, c'est peut-être une "Première Inscription" ?
    if (result.error) {
      logger.debug('First attempt failed, retrying with type: signup...');
      
      const signupResult = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup' // <--- On tente le mode inscription
      });

      // Si le mode signup fonctionne, on garde ce résultat
      if (!signupResult.error) {
        result = signupResult;
      } else {
        // 4. Si ça échoue encore, tentative désespérée mode "Recovery" 
        // (Parfois utile si l'utilisateur a cliqué sur "Mot de passe oublié" par erreur avant)
        logger.debug('Second attempt failed, retrying with type: recovery...');
        const recoveryResult = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery'
        });

        if (!recoveryResult.error) {
          result = recoveryResult;
        }
      }
    }

    logger.debug('Final OTP verification result:', { success: !result.error, error: result.error });
    return { error: result.error };
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
