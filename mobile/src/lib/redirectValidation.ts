/**
 * Validates that a redirect path is safe (internal only).
 * Same rules as web — paths are app route names or path segments, not full URLs.
 */
export function isValidRedirect(url: string | null): boolean {
  if (!url) return false;
  if (url.includes('://')) return false;
  if (!url.startsWith('/')) return false;
  if (url.startsWith('//')) return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:')) return false;
  return true;
}

export function getSafeRedirect(redirectParam: string | null, defaultPath: string = '/'): string {
  if (isValidRedirect(redirectParam)) {
    return redirectParam!;
  }
  return defaultPath;
}
