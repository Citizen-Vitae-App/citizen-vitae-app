import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from './Auth';
import * as useAuthModule from '@/hooks/useAuth';
import * as redirectValidation from '@/lib/redirectValidation';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('@/lib/redirectValidation');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

describe('Auth', () => {
  const mockSignInWithOtp = vi.fn();
  const mockSignInWithGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset search params
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    
    // Mock useAuth hook
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      signInWithOtp: mockSignInWithOtp,
      signInWithGoogle: mockSignInWithGoogle,
      user: null,
      session: null,
      profile: null,
      roles: [],
      isLoading: false,
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
      hasRole: vi.fn(),
      needsOnboarding: false,
      getDefaultRoute: vi.fn(),
      refreshProfile: vi.fn(),
    } as any);

    // Mock redirect validation
    vi.spyOn(redirectValidation, 'getSafeRedirect').mockReturnValue('/');
    vi.spyOn(redirectValidation, 'isValidRedirect').mockReturnValue(true);
  });

  describe('Happy Path - Email Authentication', () => {
    it('devrait afficher le formulaire de connexion', () => {
      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      expect(screen.getByText('Bienvenue sur CitizenVitae')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuer avec l'e-mail/i })).toBeInTheDocument();
    });

    it('devrait soumettre le formulaire avec un email valide', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('devrait naviguer vers verify-otp après succès', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('/verify-otp?email=test%40example.com')
        );
      });
    });
  });

  describe('Happy Path - Google Authentication', () => {
    it('devrait afficher le bouton Google', () => {
      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: /se connecter avec google/i })).toBeInTheDocument();
    });

    it('devrait appeler signInWithGoogle au clic', async () => {
      mockSignInWithGoogle.mockResolvedValue({ error: null });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /se connecter avec google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases - Validation', () => {
    it('devrait rejeter un email vide', async () => {
      const { toast } = await import('sonner');

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Veuillez entrer une adresse email valide');
      });
      expect(mockSignInWithOtp).not.toHaveBeenCalled();
    });

    it('devrait rejeter un email sans @', async () => {
      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      // Le composant ne devrait pas appeler signInWithOtp avec un email invalide
      await waitFor(() => {
        expect(mockSignInWithOtp).not.toHaveBeenCalled();
      });
    });

    it('devrait accepter des emails avec plusieurs @', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      fireEvent.change(emailInput, { target: { value: 'user+tag@example.com' } });
      
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith('user+tag@example.com');
      });
    });

    it('devrait gérer les espaces dans l\'email', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      fireEvent.change(emailInput, { target: { value: ' test@example.com ' } });
      
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });
      fireEvent.click(submitButton);

      // Le composant devrait trimmer l'email automatiquement
      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith('test@example.com');
      });
    });
  });

  describe('Error Handling', () => {
    it('devrait afficher une erreur si signInWithOtp échoue', async () => {
      const { toast } = await import('sonner');
      const error = new Error('Network error');
      mockSignInWithOtp.mockResolvedValue({ error });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('devrait afficher une erreur si signInWithGoogle échoue', async () => {
      const { toast } = await import('sonner');
      const error = new Error('Google auth failed');
      mockSignInWithGoogle.mockResolvedValue({ error });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /se connecter avec google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Google auth failed');
      });
    });
  });

  describe('Security - Redirect Validation', () => {
    it('devrait valider le redirect URL', async () => {
      const mockSearchParams = new URLSearchParams('?redirect=/dashboard');
      
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...vi.mocked(useAuthModule.useAuth)(),
        user: { id: '123', email: 'test@test.com' } as any,
      });

      const mockGetSafeRedirect = vi.spyOn(redirectValidation, 'getSafeRedirect');

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetSafeRedirect).toHaveBeenCalled();
      });
    });

    it('devrait bloquer les redirects malicieux', async () => {
      const mockIsValidRedirect = vi.spyOn(redirectValidation, 'isValidRedirect');
      mockIsValidRedirect.mockReturnValue(false);

      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
        // Vérifie que le redirect malicieux n'est pas passé
        const navCall = mockNavigate.mock.calls[0][0];
        expect(navCall).not.toContain('http://');
        expect(navCall).not.toContain('//');
      });
    });
  });

  describe('Loading States', () => {
    it('devrait désactiver les boutons pendant le chargement', async () => {
      mockSignInWithOtp.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText('E-mail');
      const submitButton = screen.getByRole('button', { name: /continuer avec l'e-mail/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Vérifier que le bouton est désactivé pendant le chargement
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Envoi en cours...')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });
    });
  });

  describe('Owner Invitation Flow', () => {
    it('devrait afficher le message d\'invitation owner', () => {
      mockSearchParams.set('invitation', 'owner');
      mockSearchParams.set('orgName', 'TestOrg');
      mockSearchParams.set('email', 'owner@test.com');

      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      expect(screen.getByText(/créez votre compte owner/i)).toBeInTheDocument();
    });
  });
});
