/**
 * Validates that a redirect URL is safe (internal only).
 * Prevents open redirect attacks by ensuring URLs are relative paths.
 */
export function isValidRedirect(url: string | null): boolean {
  if (!url) return false;
  
  // Must not contain protocol (http://, https://, etc.)
  if (url.includes('://')) return false;
  
  // Must start with / (relative path)
  if (!url.startsWith('/')) return false;
  
  // Prevent protocol-relative URLs (//evil.com)
  if (url.startsWith('//')) return false;
  
  // Prevent javascript: or data: URLs that start with /
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:')) return false;
  
  return true;
}

/**
 * Returns a safe redirect URL, falling back to the default if invalid.
 */
export function getSafeRedirect(redirectParam: string | null, defaultPath: string = '/'): string {
  if (isValidRedirect(redirectParam)) {
    return redirectParam!;
  }
  return defaultPath;
}
