import {
  behaviorDelta,
  clampLeadScore,
  composeLeadScore,
  profileScoreFromBuyer,
  temperatureFromScore,
  type ScoringWeights,
} from '../domain/scoring.js';
import type { BuyerProfile, InteractionEventType, Lead } from '../types.js';
import type { Providers } from '../providers/types.js';

export class LeadScoringService {
  constructor(
    private readonly data: Providers,
    private readonly weights?: ScoringWeights,
  ) {}

  applyProfile(lead: Lead, profile: BuyerProfile): Lead {
    const breakdown = profileScoreFromBuyer(profile, this.weights);
    const existing = this.data.scoreEvents
      .listByLead(lead.id)
      .filter((event) => !['purchase_now', 'purchase_1_3_months', 'cash', 'mortgage_approved'].includes(event.eventType));
    const behaviorScore = existing.reduce((sum, event) => sum + event.delta, 0);
    const composed = composeLeadScore(breakdown.points, behaviorScore);
    const previousTemperature = lead.temperature;

    this.data.scoreEvents.replaceProfileEvents(
      lead.id,
      breakdown.events.map((event, index) => {
        const running = breakdown.events.slice(0, index + 1).reduce((sum, item) => sum + item.delta, 0);
        return {
          eventType: event.eventType,
          delta: event.delta,
          reason: event.reason,
          scoreAfter: Math.min(100, running + behaviorScore),
          entityType: 'buyer_profile',
          entityId: profile.id,
          metadata: null,
          createdAt: new Date().toISOString(),
        };
      }),
    );

    const updated = this.data.leads.update(lead.id, {
      score: composed.score,
      temperature: composed.temperature,
      status: lead.status === 'new' ? 'qualified' : lead.status,
    });

    if (previousTemperature !== 'HOT' && updated.temperature === 'HOT') {
      this.data.events.publish('lead.became_hot', {
        leadId: updated.id,
        customerId: updated.customerId,
        score: updated.score,
      });
    }

    return updated;
  }

  applyBehavior(
    lead: Lead,
    eventType: InteractionEventType,
    extras?: { entityType?: string | null; entityId?: number | null },
  ): Lead {
    const mapped = behaviorDelta(eventType, this.weights);
    if (!mapped) return lead;

    const score = clampLeadScore(lead.score + mapped.delta);
    const composed = { score, temperature: temperatureFromScore(score) };
    const previousTemperature = lead.temperature;
    const event = this.data.scoreEvents.add({
      leadId: lead.id,
      eventType,
      delta: mapped.delta,
      reason: mapped.reason,
      scoreAfter: composed.score,
      entityType: extras?.entityType ?? null,
      entityId: extras?.entityId ?? null,
      metadata: null,
      createdAt: new Date().toISOString(),
    });
    void event;

    const updated = this.data.leads.update(lead.id, {
      score: composed.score,
      temperature: composed.temperature,
    });

    if (previousTemperature !== 'HOT' && updated.temperature === 'HOT') {
      this.data.events.publish('lead.became_hot', {
        leadId: updated.id,
        customerId: updated.customerId,
        score: updated.score,
      });
    }

    return updated;
  }

  snapshot(lead: Lead) {
    const events = this.data.scoreEvents.listByLead(lead.id);
    const profileScore = events
      .filter((event) => ['purchase_now', 'purchase_1_3_months', 'cash', 'mortgage_approved'].includes(event.eventType))
      .reduce((sum, event) => sum + event.delta, 0);
    const behaviorScore = events
      .filter((event) => !['purchase_now', 'purchase_1_3_months', 'cash', 'mortgage_approved'].includes(event.eventType))
      .reduce((sum, event) => sum + event.delta, 0);
    return {
      ...composeLeadScore(profileScore, behaviorScore),
      events,
    };
  }
}

export function scoring(data: Providers): LeadScoringService {
  return new LeadScoringService(data);
}
