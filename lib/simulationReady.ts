/**
 * Resolve life-sim prerequisites from profile / twin / dream_self data
 * collected during onboarding, so first sim is not hard-blocked when
 * the user already answered these questions.
 */

export type SimulationRelationship = {
  name: string;
  type: string;
  status: string;
  description: string;
};

export type SimulationReadyResult = {
  ready: boolean;
  missing: Array<'net_worth' | 'location' | 'relationship'>;
  netWorth: string | null;
  location: string | null;
  relationships: SimulationRelationship[];
};

export function resolveSimulationReady(
  profile: any | null | undefined,
  relationships: any[] | null | undefined
): SimulationReadyResult {
  const dream = profile?.dream_vision || {};
  const relDetails = profile?.relationship_details || {};

  const netWorth: string | null =
    (profile?.net_worth && String(profile.net_worth).trim()) ||
    null;

  const location: string | null =
    (profile?.current_location && String(profile.current_location).trim()) ||
    (profile?.hometown && String(profile.hometown).trim()) ||
    (dream?.dream_city && String(dream.dream_city).trim()) ||
    null;

  const dbRels = relationships || [];
  let simRelationships: SimulationRelationship[] = dbRels.map((rel: any) => ({
    name: rel.name,
    type: rel.relationship_type || 'friend',
    status: 'good',
    description: `Known for ${rel.years_known || 0} years`,
  }));

  // Prefill from onboarding relationship_details when relationships table is empty
  if (simRelationships.length === 0 && relDetails?.status) {
    if (relDetails.partnerName) {
      simRelationships = [
        {
          name: String(relDetails.partnerName),
          type: mapRelationshipStatusToType(relDetails.status),
          status: 'good',
          description: relDetails.howLong
            ? `Together ${relDetails.howLong}`
            : 'From onboarding',
        },
      ];
    } else {
      // Single / dating-without-name still counts as collected relationship context
      simRelationships = [
        {
          name: 'Self',
          type: 'self',
          status: String(relDetails.status),
          description: relDetails.lookingFor
            ? `Looking for: ${relDetails.lookingFor}`
            : `Status: ${relDetails.status}`,
        },
      ];
    }
  }

  const missing: SimulationReadyResult['missing'] = [];
  if (!netWorth) missing.push('net_worth');
  if (!location) missing.push('location');
  if (simRelationships.length === 0) missing.push('relationship');

  return {
    ready: missing.length === 0,
    missing,
    netWorth,
    location,
    relationships: simRelationships,
  };
}

function mapRelationshipStatusToType(status: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('married') || s.includes('partner')) return 'partner';
  if (s.includes('dating')) return 'partner';
  return 'friend';
}
