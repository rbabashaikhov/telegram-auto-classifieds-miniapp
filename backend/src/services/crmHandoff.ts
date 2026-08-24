import type { CrmHandoffPayload } from '../types.js';
import type { Providers } from '../providers/types.js';
import { scoring } from './scoring.js';

export function crmHandoff(data: Providers, customerId: number): CrmHandoffPayload | null {
  const customer = data.customers.getById(customerId);
  if (!customer) return null;
  const profile = data.profiles.getByCustomerId(customerId) ?? null;
  const lead = data.leads.getByCustomerId(customerId) ?? null;
  const matches = profile ? data.matches.listByProfile(profile.id).slice(0, 5) : [];
  return {
    customer,
    buyerProfile: profile,
    lead,
    leadScore: lead ? scoring(data).snapshot(lead) : null,
    scoreEvents: lead ? data.scoreEvents.listByLead(lead.id) : [],
    topMatches: matches.map((match) => ({
      ...match,
      property: data.properties.getProperty(match.propertyId),
    })),
    favorites: data.favorites.listByCustomer(customerId),
    viewings: data.viewings.listByCustomer(customerId),
    source: {
      utmSource: customer.utmSource,
      utmMedium: customer.utmMedium,
      utmCampaign: customer.utmCampaign,
      utmContent: customer.utmContent,
    },
    recentInteractionEvents: data.interactions.listByCustomer(customerId, 20),
  };
}
