import { AppError } from '../errors.js';
import type { BuyerProfileInput } from '../providers/types.js';
import type { Providers } from '../providers/types.js';
import { persistMatches } from './matching.js';
import { scoring } from './scoring.js';
import { trackEvent } from './customers.js';

export function saveQualification(data: Providers, input: BuyerProfileInput) {
  if (!input.consentAt) {
    throw new AppError('Consent is required before saving qualification', 400, 'CONSENT_REQUIRED');
  }
  if (input.payment === 'mortgage' && !input.mortgageStatus) {
    throw new AppError('Mortgage status is required', 400, 'VALIDATION_ERROR');
  }

  return data.transaction(() => {
    const profile = data.profiles.upsert(input);
    const agent = data.leads.getByCustomerId(input.customerId)?.agentId
      ? data.agents.getById(data.leads.getByCustomerId(input.customerId)!.agentId!)
      : data.agents.pickForAssignment();
    const created = !data.leads.getByCustomerId(input.customerId);
    const lead = data.leads.upsertForCustomer({
      customerId: input.customerId,
      buyerProfileId: profile.id,
      agentId: agent?.id ?? null,
      score: 0,
      temperature: 'COLD',
      status: 'qualified',
    });
    const scored = scoring(data).applyProfile(lead, profile);
    const matches = persistMatches(data, profile);
    trackEvent(data, {
      customerId: input.customerId,
      eventType: 'qualification_completed',
      entityType: 'buyer_profile',
      entityId: profile.id,
    });
    data.events.publish(created ? 'lead.created' : 'lead.qualified', {
      leadId: scored.id,
      customerId: input.customerId,
      score: scored.score,
      temperature: scored.temperature,
    });
    if (created) {
      data.events.publish('lead.qualified', {
        leadId: scored.id,
        customerId: input.customerId,
        score: scored.score,
        temperature: scored.temperature,
      });
    }
    return { profile, lead: scored, matches };
  });
}
