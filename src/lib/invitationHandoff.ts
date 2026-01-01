/**
 * Invitation Handoff Utility
 * 
 * This utility captures and persists the "owner invitation" intent from URL parameters.
 * It allows the app to "remember" that a user arrived via an owner invitation link,
 * even if Supabase redirects them to a different page initially.
 */

const STORAGE_KEY = 'citizen_vitae_owner_invitation';
const EXPIRY_MINUTES = 30;

interface OwnerInvitationIntent {
  orgId: string;
  orgName?: string;
  timestamp: number;
}

/**
 * Captures the owner invitation intent from current URL and stores it
 */
export function captureOwnerInvitation(): OwnerInvitationIntent | null {
  const params = new URLSearchParams(window.location.search);
  const invitation = params.get('invitation');
  const orgId = params.get('org');
  const orgName = params.get('orgName');

  // Only capture if this is an owner invitation with org ID
  if (invitation === 'owner' && orgId) {
    const intent: OwnerInvitationIntent = {
      orgId,
      orgName: orgName || undefined,
      timestamp: Date.now(),
    };
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
      console.log('[InvitationHandoff] Captured owner invitation:', intent);
    } catch (e) {
      console.error('[InvitationHandoff] Failed to store invitation:', e);
    }
    
    return intent;
  }
  
  return null;
}

/**
 * Retrieves the stored owner invitation intent if valid
 */
export function getOwnerInvitation(): OwnerInvitationIntent | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const intent: OwnerInvitationIntent = JSON.parse(stored);
    
    // Check if expired
    const now = Date.now();
    const expiryMs = EXPIRY_MINUTES * 60 * 1000;
    if (now - intent.timestamp > expiryMs) {
      console.log('[InvitationHandoff] Invitation expired, clearing');
      clearOwnerInvitation();
      return null;
    }
    
    return intent;
  } catch (e) {
    console.error('[InvitationHandoff] Failed to retrieve invitation:', e);
    return null;
  }
}

/**
 * Checks if there's an active owner invitation (either in URL or stored)
 */
export function hasActiveOwnerInvitation(): boolean {
  // Check URL first
  const params = new URLSearchParams(window.location.search);
  if (params.get('invitation') === 'owner' && params.get('org')) {
    return true;
  }
  
  // Check storage
  return getOwnerInvitation() !== null;
}

/**
 * Gets the organization onboarding URL for the active invitation
 */
export function getOwnerInvitationRedirectUrl(): string | null {
  // Check URL first
  const params = new URLSearchParams(window.location.search);
  const orgId = params.get('org');
  const orgName = params.get('orgName');
  
  if (params.get('invitation') === 'owner' && orgId) {
    const url = `/organization/onboarding?org=${orgId}${orgName ? `&orgName=${encodeURIComponent(orgName)}` : ''}&invitation=owner`;
    return url;
  }
  
  // Check storage
  const intent = getOwnerInvitation();
  if (intent) {
    const url = `/organization/onboarding?org=${intent.orgId}${intent.orgName ? `&orgName=${encodeURIComponent(intent.orgName)}` : ''}&invitation=owner`;
    return url;
  }
  
  return null;
}

/**
 * Clears the stored owner invitation intent
 */
export function clearOwnerInvitation(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    console.log('[InvitationHandoff] Cleared owner invitation');
  } catch (e) {
    console.error('[InvitationHandoff] Failed to clear invitation:', e);
  }
}

/**
 * Check if we're currently on the organization onboarding page
 */
export function isOnOrganizationOnboarding(): boolean {
  return window.location.pathname.includes('/organization/onboarding');
}
