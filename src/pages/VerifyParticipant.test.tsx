import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VerifyParticipant from './VerifyParticipant';
import { supabase } from '@/integrations/supabase/client';
import * as useAuthModule from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/useAuth');
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams('?token=valid-token-123');
let mockRegistrationId = 'reg-123';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ registrationId: mockRegistrationId }),
    useSearchParams: () => [mockSearchParams],
  };
});

describe('VerifyParticipant', () => {
  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
  };

  const mockRegistrationData = {
    id: 'reg-123',
    event_id: 'event-123',
    events: {
      id: 'event-123',
      name: 'Nettoyage de Plage',
      organization_id: 'org-123',
      organizations: {
        id: 'org-123',
        name: 'Eco Warriors',
      },
    },
  };

  const mockMembership = {
    id: 'member-123',
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset search params
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    mockSearchParams.set('token', 'valid-token-123');
    
    // Reset registration ID
    mockRegistrationId = 'reg-123';
    
    // Mock useAuth hook avec utilisateur authentifié
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockUser as any,
      isLoading: false,
      session: null,
      profile: null,
      roles: [],
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      hasRole: vi.fn(),
      needsOnboarding: false,
      getDefaultRoute: vi.fn(),
      refreshProfile: vi.fn(),
    } as any);
  });

  describe('Happy Path - Vérification réussie', () => {
    it('devrait vérifier un participant avec succès', async () => {
      // Mock successful registration lookup
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      // Mock membership check
      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMembership,
          error: null,
        }),
      });

      let selectCallCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          selectCallCount++;
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      // Mock successful verification
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          message: 'Présence validée',
          user_name: 'John Doe',
          event_name: 'Nettoyage de Plage',
        },
        error: null,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Utiliser getAllByText car le texte peut apparaître plusieurs fois
        const elements = screen.getAllByText('Présence validée');
        expect(elements.length).toBeGreaterThan(0);
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('devrait afficher les informations du participant', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMembership,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          user_name: 'Jane Smith',
          event_name: 'Mission Solidaire',
        },
        error: null,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/jane smith/i)).toBeInTheDocument();
      });
    });

    it('devrait générer un certificat après vérification', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMembership,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      vi.mocked(supabase.functions.invoke)
        .mockResolvedValueOnce({
          data: { success: true, user_name: 'John Doe' },
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: { certificate_url: 'https://example.com/cert.pdf' },
          error: null,
        } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith(
          'generate-certificate',
          expect.objectContaining({
            body: expect.objectContaining({
              registration_id: 'reg-123',
              validated_by: mockUser.id,
            }),
          })
        );
      });
    });
  });

  describe('Security - Permissions', () => {
    it('devrait rediriger vers auth si non authentifié', async () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        ...vi.mocked(useAuthModule.useAuth)(),
        user: null,
        isLoading: false,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('/auth?redirect=')
        );
      });
    });

    it('devrait bloquer les non-membres de l\'organisation', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      // Mock no membership
      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/accès non autorisé/i)).toBeInTheDocument();
        expect(screen.getByText(/vous devez être membre/i)).toBeInTheDocument();
      });
    });

    it('devrait afficher le nom de l\'organisation dans l\'erreur de permission', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/eco warriors/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases - Paramètres invalides', () => {
    it('devrait rejeter un token manquant', async () => {
      mockSearchParams.delete('token');

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/lien de vérification invalide/i)).toBeInTheDocument();
      });
    });

    it('devrait rejeter un registrationId manquant', async () => {
      mockRegistrationId = undefined as any;

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/lien de vérification invalide/i)).toBeInTheDocument();
      });
    });

    it('devrait gérer une inscription introuvable', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/inscription introuvable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('devrait gérer les erreurs de l\'edge function', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMembership,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Verification failed' },
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/erreur lors de la vérification/i)).toBeInTheDocument();
      });
    });

    it('devrait afficher un message d\'erreur générique si l\'edge function échoue', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMembership,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      // Simuler un échec de vérification
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, message: 'QR code invalide' },
        error: null,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/qr code invalide/i)).toBeInTheDocument();
      });
    });

    it('devrait gérer les erreurs réseau avec un message approprié', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/une erreur inattendue s'est produite/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('devrait afficher un indicateur de chargement', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        ...vi.mocked(useAuthModule.useAuth)(),
        isLoading: true,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      expect(screen.getByText(/vérification en cours/i)).toBeInTheDocument();
    });

    it('devrait afficher un loader pendant le chargement de l\'auth', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        ...vi.mocked(useAuthModule.useAuth)(),
        user: null,
        isLoading: true,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      expect(screen.getByText(/vérification en cours/i)).toBeInTheDocument();
    });
  });

  describe('Navigation après vérification', () => {
    it('devrait proposer de scanner un autre QR code', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMembership,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, user_name: 'John Doe', event_name: 'Test Event' },
        error: null,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Présence validée')).toBeInTheDocument();
      });

      // Vérifier que le bouton de scanner est présent
      expect(screen.getByRole('button', { name: /scanner un autre qr code/i })).toBeInTheDocument();
    });

    it('devrait proposer de retourner au scanner après échec', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRegistrationData,
            error: null,
          }),
        }),
      });

      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMembership,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return { select: mockSelect } as any;
        }
        if (table === 'organization_members') {
          return { select: mockMembershipSelect } as any;
        }
        return { select: vi.fn() } as any;
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, message: 'QR code invalide' },
        error: null,
      } as any);

      render(
        <BrowserRouter>
          <VerifyParticipant />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Échec de la vérification')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retour au scanner/i })).toBeInTheDocument();
    });
  });
});
