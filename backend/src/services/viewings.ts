import { AppError } from '../errors.js';
import type { Viewing, ViewingStatus, ViewingType } from '../types.js';
import type { Providers } from '../providers/types.js';
import { trackEvent } from './customers.js';
import { scoring } from './scoring.js';

const SLOTS = ['10:00', '11:30', '13:00', '15:00', '17:00', '19:00'];

export function viewingSlots(data: Providers, propertyId: number, date: string): string[] {
  const occupied = new Set(
    data.viewings.occupiedSlots(propertyId, date).map((value) => value.slice(11, 16)),
  );
  return SLOTS.filter((slot) => !occupied.has(slot));
}

export function requestViewing(
  data: Providers,
  params: {
    customerId: number;
    propertyId: number;
    scheduledAt: string;
    type: ViewingType;
  },
): Viewing {
  const property = data.properties.getProperty(params.propertyId);
  if (!property) throw new AppError('Property not found', 404, 'NOT_FOUND');

  const date = params.scheduledAt.slice(0, 10);
  const time = params.scheduledAt.slice(11, 16);
  if (!viewingSlots(data, params.propertyId, date).includes(time)) {
    throw new AppError('Time slot is not available', 409, 'SLOT_TAKEN');
  }

  const lead = data.leads.getByCustomerId(params.customerId);
  const viewing = data.viewings.create({
    customerId: params.customerId,
    propertyId: params.propertyId,
    agentId: lead?.agentId ?? data.agents.pickForAssignment()?.id ?? null,
    scheduledAt: params.scheduledAt,
    type: params.type,
    status: 'scheduled',
  });

  trackEvent(data, {
    customerId: params.customerId,
    eventType: 'viewing_requested',
    entityType: 'viewing',
    entityId: viewing.id,
    metadata: { propertyId: params.propertyId, type: params.type },
  });
  if (lead) {
    scoring(data).applyBehavior(lead, 'viewing_requested', { entityType: 'viewing', entityId: viewing.id });
    data.leads.update(lead.id, { status: 'viewing' });
  }
  data.events.publish('viewing.requested', {
    viewingId: viewing.id,
    customerId: params.customerId,
    propertyId: params.propertyId,
    scheduledAt: params.scheduledAt,
  });
  return viewing;
}

export function changeViewingStatus(data: Providers, id: number, status: ViewingStatus, note?: string) {
  const updated = data.viewings.updateStatus(id, status, note);
  if (status === 'completed') {
    data.events.publish('viewing.completed', {
      viewingId: updated.id,
      customerId: updated.customerId,
      propertyId: updated.propertyId,
    });
  }
  return updated;
}

export function cancelViewing(data: Providers, id: number, customerId?: number) {
  const viewing = data.viewings.getById(id);
  if (!viewing) throw new AppError('Viewing not found', 404, 'NOT_FOUND');
  if (customerId && viewing.customerId !== customerId) {
    throw new AppError('Viewing not found', 404, 'NOT_FOUND');
  }
  if (viewing.status === 'cancelled') return viewing;
  return changeViewingStatus(data, id, 'cancelled', 'cancelled_by_client');
}
