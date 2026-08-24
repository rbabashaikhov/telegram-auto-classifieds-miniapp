import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import { trackEvent } from './customers.js';
import { scoring } from './scoring.js';

export function addFavorite(data: Providers, customerId: number, propertyId: number) {
  const property = data.properties.getProperty(propertyId);
  if (!property) throw new AppError('Property not found', 404, 'NOT_FOUND');

  const result = data.favorites.add(customerId, propertyId);
  if (result.created) {
    trackEvent(data, {
      customerId,
      eventType: 'property_favorited',
      entityType: 'property',
      entityId: propertyId,
    });
    const lead = data.leads.getByCustomerId(customerId);
    if (lead) scoring(data).applyBehavior(lead, 'property_favorited', { entityType: 'property', entityId: propertyId });
    data.events.publish('favorite.added', { customerId, propertyId, favoriteId: result.favorite.id });
  }
  return result;
}

export function removeFavorite(data: Providers, customerId: number, propertyId: number) {
  const removed = data.favorites.remove(customerId, propertyId);
  if (removed) {
    trackEvent(data, {
      customerId,
      eventType: 'property_unfavorited',
      entityType: 'property',
      entityId: propertyId,
    });
  }
  return removed;
}
