/**
 * Extrait l’UUID d’organisation depuis une URL ou un chemin type `/organization/:id`
 * (site Citizen Vitae ou chemins relatifs dans du HTML).
 */
export function parseOrganizationIdFromHref(href: string): string | null {
  const t = href?.trim();
  if (!t) return null;
  const re =
    /\/organization\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const m = t.match(re);
  return m ? m[1] : null;
}
