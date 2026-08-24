import type { Providers } from '../providers/types.js';

export function createSellerLead(
  data: Providers,
  params: {
    customerId: number;
    location: string;
    propertyType: 'new_build' | 'secondary' | 'apartments';
    rooms: 'studio' | '1' | '2' | '3plus';
    area: number;
    condition: 'excellent' | 'good' | 'needs_renovation' | 'unfinished';
    desiredPrice: number;
    saleTiming: 'now' | '1_3_months' | '3_6_months' | 'exploring';
    comment: string | null;
    contact: string | null;
  },
) {
  const lead = data.sellerLeads.create({
    customerId: params.customerId,
    location: params.location,
    propertyType: params.propertyType,
    rooms: params.rooms,
    area: params.area,
    condition: params.condition,
    desiredPrice: params.desiredPrice,
    saleTiming: params.saleTiming,
    comment: params.comment,
    contact: params.contact,
    status: 'new',
  });
  data.events.publish('seller_lead.created', {
    sellerLeadId: lead.id,
    customerId: params.customerId,
    location: params.location,
    desiredPrice: params.desiredPrice,
  });
  return lead;
}
