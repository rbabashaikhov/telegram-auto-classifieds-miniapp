import { rankMatches, type MatchingWeights } from '../domain/matching.js';
import type { BuyerProfile, PropertyMatch } from '../types.js';
import type { Providers } from '../providers/types.js';

export function catalogForMatching(data: Providers) {
  return data.properties.listProperties({ activeOnly: true }).map((property) => ({
    property,
    project: property.project,
    featureCodes: property.features.map((feature) => feature.code),
  }));
}

export function computeMatches(
  profile: BuyerProfile,
  data: Providers,
  weights?: MatchingWeights,
  now = new Date(),
): PropertyMatch[] {
  return rankMatches(profile, catalogForMatching(data), weights, now, profile.id);
}

export function persistMatches(data: Providers, profile: BuyerProfile, weights?: MatchingWeights): PropertyMatch[] {
  const ranked = computeMatches(profile, data, weights);
  return data.matches.replaceForProfile(profile.id, ranked);
}
