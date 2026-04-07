/**
 * Aligné sur le web (`src/lib/utils.ts`) : titre court pour l’overlay image (max 24 car., mots entiers).
 */
export function generateShortTitle(name: string, maxChars = 24): string {
  const words = name.split(' ');
  let result = '';
  for (const word of words) {
    const potentialResult = result ? `${result} ${word}` : word;
    if (potentialResult.length <= maxChars) {
      result = potentialResult;
    } else {
      break;
    }
  }
  return result || words[0] || '';
}
