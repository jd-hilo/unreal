/** Architect chat: include as much twin context as practical (hard cap for API safety). */
export const ARCHITECT_CORE_PACK_MAX_CHARS = 100_000;

export function limitCorePackForArchitect(
  pack: string,
  maxChars: number = ARCHITECT_CORE_PACK_MAX_CHARS
): string {
  if (pack.length <= maxChars) return pack;
  return `${pack.slice(0, maxChars)}\n\n[Profile truncated for length; earlier sections are preserved.]`;
}
