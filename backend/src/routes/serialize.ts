import type {
  BuyerProfile,
  Customer,
  Lead,
  PropertyDetails,
  PropertyMatch,
  SellerLead,
  ViewingDetails,
} from '../types.js';
import { DISTRICT_LABELS, FEATURE_LABELS } from '../types.js';

export function serializeCustomer(customer: Customer) {
  return {
    id: customer.id,
    name: customer.name,
    username: customer.username,
    phone: customer.phone,
    utm: {
      source: customer.utmSource,
      medium: customer.utmMedium,
      campaign: customer.utmCampaign,
      content: customer.utmContent,
    },
    createdAt: customer.createdAt,
  };
}

export function serializeProfile(profile: BuyerProfile) {
  return {
    id: profile.id,
    goal: profile.goal,
    propertyType: profile.propertyType,
    locations: profile.locations,
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    rooms: profile.rooms,
    purchaseTiming: profile.purchaseTiming,
    payment: profile.payment,
    mortgageStatus: profile.mortgageStatus,
    preferences: profile.preferences,
    areaMin: profile.areaMin,
    areaMax: profile.areaMax,
    consentAt: profile.consentAt,
    updatedAt: profile.updatedAt,
  };
}

export function serializeProperty(property: PropertyDetails, match?: PropertyMatch | null) {
  return {
    id: property.id,
    unitNumber: property.unitNumber,
    rooms: property.rooms,
    roomsCount: property.roomsCount,
    area: property.area,
    floor: property.floor,
    floorsTotal: property.floorsTotal,
    price: property.price,
    finish: property.finish,
    status: property.status,
    completionDate: property.completionDate,
    gallery: property.gallery,
    description: property.description,
    features: property.features.map((feature) => ({
      code: feature.code,
      label: feature.label || FEATURE_LABELS[feature.code],
    })),
    project: {
      id: property.project.id,
      slug: property.project.slug,
      name: property.project.name,
      district: property.project.district,
      districtLabel: DISTRICT_LABELS[property.project.district],
      address: property.project.address,
      description: property.project.description,
      propertyType: property.project.propertyType,
      completionDate: property.project.completionDate,
      imageUrl: property.project.imageUrl,
      features: property.project.features,
    },
    match: match
      ? {
          score: match.score,
          reasons: match.reasons,
        }
      : null,
  };
}

export function serializeLead(lead: Lead) {
  return {
    id: lead.id,
    customerId: lead.customerId,
    buyerProfileId: lead.buyerProfileId,
    agentId: lead.agentId,
    score: lead.score,
    temperature: lead.temperature,
    status: lead.status,
    updatedAt: lead.updatedAt,
  };
}

export function serializeViewing(viewing: ViewingDetails) {
  return {
    id: viewing.id,
    customerId: viewing.customerId,
    propertyId: viewing.propertyId,
    agentId: viewing.agentId,
    scheduledAt: viewing.scheduledAt,
    type: viewing.type,
    status: viewing.status,
    history: viewing.history,
    createdAt: viewing.createdAt,
  };
}

export function serializeSeller(lead: SellerLead) {
  return {
    id: lead.id,
    customerId: lead.customerId,
    location: lead.location,
    locationLabel: DISTRICT_LABELS[lead.location as keyof typeof DISTRICT_LABELS] || lead.location,
    propertyType: lead.propertyType,
    rooms: lead.rooms,
    area: lead.area,
    condition: lead.condition,
    desiredPrice: lead.desiredPrice,
    saleTiming: lead.saleTiming,
    comment: lead.comment,
    contact: lead.contact,
    status: lead.status,
    createdAt: lead.createdAt,
  };
}
