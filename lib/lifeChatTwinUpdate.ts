import { getProfile, updateProfileFields, patchTwinBriefing } from '@/lib/storage';
import type { LifeChatTwinUpdateResult } from '@/lib/ai';
import type { TwinBriefingPatch } from '@/types/database';

function norm(s: unknown): string {
  if (s == null) return '';
  return String(s).trim();
}

function briefingPatchHasContent(p: TwinBriefingPatch | undefined): boolean {
  if (!p) return false;
  if (Array.isArray(p.threads) && p.threads.length > 0) return true;
  if (p.lens && Object.values(p.lens).some((v) => typeof v === 'string' && v.trim())) return true;
  if (
    p.direction &&
    Object.values(p.direction).some((v) => typeof v === 'string' && v.trim())
  )
    return true;
  if (p.identity && Object.values(p.identity).some((v) => typeof v === 'string' && v.trim()))
    return true;
  return false;
}

/**
 * Applies AI-suggested patches from a life / decision Architect chat (Twin Briefing + profile columns).
 */
export async function applyLifeChatTwinPatches(
  userId: string,
  patch: LifeChatTwinUpdateResult
): Promise<string[]> {
  const applied: string[] = [];
  let profile = await getProfile(userId);
  if (!profile) return applied;

  if (patch.profile) {
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch.profile)) {
      if (typeof v !== 'string') continue;
      const t = v.trim();
      if (!t) continue;
      const cur = norm((profile as Record<string, unknown>)[k]);
      if (cur === t) continue;
      fields[k] = t;
    }
    if (Object.keys(fields).length > 0) {
      await updateProfileFields(userId, fields as Parameters<typeof updateProfileFields>[1]);
      applied.push(...Object.keys(fields));
      profile = await getProfile(userId);
    }
  }

  if (briefingPatchHasContent(patch.briefing_patch)) {
    await patchTwinBriefing(userId, patch.briefing_patch!);
    applied.push('twin_briefing');
  }

  return applied;
}
