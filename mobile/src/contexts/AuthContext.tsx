import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
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
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  needsOnboarding: boolean;
  getDefaultRoute: () => string;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseOAuthSessionFromUrl(url: string): {
  access_token: string;
  refresh_token: string;
} | null {
  try {
    const hash = url.includes('#') ? url.split('#')[1] : '';
    const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';
    const params = new URLSearchParams(hash || query || '');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      return { access_token, refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const invitationsHandledRef = useRef(new Set<string>());
  const isFetchingProfileRef = useRef(false);

  const handlePendingInvitations = useCallback(async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      if (!userEmail) return;

      const { data: invitations, error: invError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .eq('status', 'pending');

      if (invError || !invitations?.length) return;

      for (const inv of invitations) {
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', inv.organization_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (existingMember) {
          await supabase
            .from('organization_invitations')
            .update({ status: 'accepted', responded_at: new Date().toISOString() })
            .eq('id', inv.id);
          continue;
        }

        const { error: memberError } = await supabase.from('organization_members').insert({
          organization_id: inv.organization_id,
          user_id: userId,
          role: inv.role || 'member',
          custom_role_title: inv.custom_role_title,
          is_owner: inv.invitation_type === 'owner',
        });

        if (memberError) continue;

        if (inv.team_id) {
          await supabase.from('team_members').insert({
            team_id: inv.team_id,
            user_id: userId,
            is_leader: false,
          });
        }

        await supabase
          .from('organization_invitations')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', inv.id);
      }

      await queryClient.invalidateQueries({ queryKey: ['user_roles', userId] });
      const { data: refreshedRoles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
      if (refreshedRoles) {
        setRoles((refreshedRoles as UserRole[]).map((r) => r.role));
      }
    } catch (e) {
      console.warn('[AuthProvider] invitations', e);
    }
  }, [queryClient]);

  const fetchProfileAndRoles = useCallback(
    async (userId: string) => {
      if (isFetchingProfileRef.current) return;
      isFetchingProfileRef.current = true;

      try {
        const [profileData, rolesData] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ['profile', userId],
            queryFn: async () => {
              const { data, error } = await supabase
                .from('profiles')
                .select(
                  'id, first_name, last_name, avatar_url, bio, date_of_birth, onboarding_completed, id_verified, verification_status, didit_session_id'
                )
                .eq('id', userId)
                .maybeSingle();
              if (error) throw error;
              return data;
            },
            staleTime: 5 * 60 * 1000,
          }),
          queryClient.fetchQuery({
            queryKey: ['user_roles', userId],
            queryFn: async () => {
              const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
              if (error) throw error;
              return data || [];
            },
            staleTime: 5 * 60 * 1000,
          }),
        ]);

        let nextProfile = profileData as Profile | null;

        if (!nextProfile) {
          const { data: userData } = await supabase.auth.getUser();
          const userEmail = userData?.user?.email;
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userEmail,
              onboarding_completed: false,
            })
            .select(
              'id, first_name, last_name, avatar_url, bio, date_of_birth, onboarding_completed, id_verified, verification_status, didit_session_id'
            )
            .single();

          if (!insertError && newProfile) {
            nextProfile = newProfile as Profile;
            queryClient.setQueryData(['profile', userId], newProfile);
          }
        }

        if (nextProfile) {
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
            staleTime: 5 * 60 * 1000,
          });

          if (!prefsExist) {
            const { data: newPrefs } = await supabase
              .from('user_preferences')
              .insert({
                user_id: userId,
                language: 'fr',
                email_opt_in: true,
                sms_opt_in: false,
                geolocation_enabled: false,
              })
              .select()
              .single();
            if (newPrefs) {
              queryClient.setQueryData(['user_preferences', userId], newPrefs);
            }
          }
        }

        if (nextProfile) setProfile(nextProfile);
        if (rolesData) setRoles((rolesData as UserRole[]).map((r) => r.role));

        if (nextProfile && !invitationsHandledRef.current.has(userId)) {
          await handlePendingInvitations(userId);
          invitationsHandledRef.current.add(userId);
        }
      } catch (e) {
        console.warn('[AuthProvider] fetch profile/roles', e);
      } finally {
        setIsLoading(false);
        isFetchingProfileRef.current = false;
      }
    },
    [queryClient, handlePendingInvitations]
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setIsLoading(true);
        setTimeout(() => {
          void fetchProfileAndRoles(nextSession.user!.id);
        }, 0);
      } else {
        invitationsHandledRef.current.clear();
        setProfile(null);
        setRoles([]);
        setIsLoading(false);
        queryClient.clear();
      }
    });

    void supabase.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial);
      setUser(initial?.user ?? null);
      if (initial?.user) {
        void fetchProfileAndRoles(initial.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndRoles, queryClient]);

  const refreshProfile = async () => {
    if (!user?.id) return;
    try {
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      const data = await queryClient.fetchQuery({
        queryKey: ['profile', user.id],
        queryFn: async () => {
          const { data: row, error } = await supabase
            .from('profiles')
            .select(
              'id, first_name, last_name, avatar_url, bio, date_of_birth, onboarding_completed, id_verified, verification_status, didit_session_id'
            )
            .eq('id', user.id)
            .single();
          if (error) throw error;
          return row;
        },
        staleTime: 5 * 60 * 1000,
      });
      if (data) setProfile(data as Profile);
    } catch (e) {
      console.warn('[AuthProvider] refreshProfile', e);
    }
  };

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return { error: error as Error | null };
  };

  const verifyOtp = async (email: string, token: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    let result = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });

    if (result.error) {
      const signupResult = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });
      if (!signupResult.error) {
        result = signupResult;
      } else {
        const recoveryResult = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery',
        });
        if (!recoveryResult.error) {
          result = recoveryResult;
        }
      }
    }

    return { error: result.error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) return { error: error as Error };
      if (!data?.url) return { error: new Error('No OAuth URL returned') };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        preferEphemeralSession: false,
        ...(Platform.OS === 'android'
          ? {
              showInRecents: false,
              createTask: false,
            }
          : {
              dismissButtonStyle: 'close',
            }),
      });

      if (result.type !== 'success' || !result.url) {
        return { error: null };
      }

      const tokens = parseOAuthSessionFromUrl(result.url);
      if (tokens) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        return { error: sessionError as Error | null };
      }

      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        return { error: exchangeError as Error | null };
      }

      return { error: new Error('Could not complete Google sign-in') };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
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
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
