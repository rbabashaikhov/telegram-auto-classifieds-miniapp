import type { InteractionEventType } from '../types.js';
import type { Providers } from '../providers/types.js';
import { trackEvent } from './customers.js';
import { scoring } from './scoring.js';

export function recordPropertyView(data: Providers, customerId: number, propertyId: number) {
  const revisited = data.interactions.hasEvent(customerId, 'property_viewed', 'property', propertyId);
  const eventType: InteractionEventType = revisited ? 'property_revisited' : 'property_viewed';
  const event = trackEvent(data, {
    customerId,
    eventType,
    entityType: 'property',
    entityId: propertyId,
  });
  const lead = data.leads.getByCustomerId(customerId);
  if (lead) scoring(data).applyBehavior(lead, eventType, { entityType: 'property', entityId: propertyId });
  return { event, eventType };
}

export function recordPaymentCalculated(data: Providers, customerId: number, propertyId: number) {
  const event = trackEvent(data, {
    customerId,
    eventType: 'payment_calculated',
    entityType: 'property',
    entityId: propertyId,
  });
  const lead = data.leads.getByCustomerId(customerId);
  if (lead) scoring(data).applyBehavior(lead, 'payment_calculated', { entityType: 'property', entityId: propertyId });
  return event;
}

export function recordManagerContact(data: Providers, customerId: number) {
  const event = trackEvent(data, {
    customerId,
    eventType: 'manager_contact_requested',
  });
  const lead = data.leads.getByCustomerId(customerId);
  if (lead) {
    scoring(data).applyBehavior(lead, 'manager_contact_requested');
    data.leads.update(lead.id, { status: 'handoff' });
  }
  return event;
}
