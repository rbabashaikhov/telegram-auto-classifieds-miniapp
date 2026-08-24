import type { Providers } from '../providers/types.js';

const FUNNEL: Array<{ key: string; event: string }> = [
  { key: 'appOpened', event: 'app_opened' },
  { key: 'qualificationStarted', event: 'qualification_started' },
  { key: 'qualificationCompleted', event: 'qualification_completed' },
  { key: 'propertyViewed', event: 'property_viewed' },
  { key: 'favorite', event: 'property_favorited' },
  { key: 'viewingRequested', event: 'viewing_requested' },
];

function conversion(from: number, to: number): number {
  if (from <= 0) return 0;
  return Math.round((to / from) * 1000) / 10;
}

export function dashboardKpis(data: Providers) {
  const leads = data.leads.list();
  const viewings = data.viewings.list();
  const unique = data.interactions.uniqueCustomersByType();
  return {
    newLeads: leads.filter((lead) => lead.status === 'new' || lead.status === 'qualified').length,
    hotLeads: leads.filter((lead) => lead.temperature === 'HOT').length,
    qualificationsCompleted: unique.qualification_completed ?? 0,
    viewingRequests: viewings.filter((item) => item.status === 'scheduled' || item.status === 'confirmed').length,
  };
}

export function funnelAnalytics(data: Providers) {
  const unique = data.interactions.uniqueCustomersByType();
  const counts = FUNNEL.map((stage) => ({
    key: stage.key,
    event: stage.event,
    customers: unique[stage.event] ?? 0,
  }));
  const conversions = counts.map((stage, index) => ({
    from: index === 0 ? null : counts[index - 1]?.key,
    to: stage.key,
    rate: index === 0 ? 100 : conversion(counts[index - 1]?.customers ?? 0, stage.customers),
  }));

  const leads = data.leads.list();
  const temperature = {
    HOT: leads.filter((lead) => lead.temperature === 'HOT').length,
    WARM: leads.filter((lead) => lead.temperature === 'WARM').length,
    COLD: leads.filter((lead) => lead.temperature === 'COLD').length,
  };

  const events = data.interactions.listAll(2000);
  const viewed: Record<number, number> = {};
  const favorited: Record<number, number> = {};
  const viewingsByProperty: Record<number, number> = {};
  const utmSource: Record<string, number> = {};
  const utmCampaign: Record<string, number> = {};

  for (const event of events) {
    if (event.eventType === 'property_viewed' && event.entityId) {
      viewed[event.entityId] = (viewed[event.entityId] ?? 0) + 1;
    }
    if (event.eventType === 'property_favorited' && event.entityId) {
      favorited[event.entityId] = (favorited[event.entityId] ?? 0) + 1;
    }
    if (event.eventType === 'viewing_requested' && event.entityId) {
      viewingsByProperty[event.entityId] = (viewingsByProperty[event.entityId] ?? 0) + 1;
    }
    if (event.eventType === 'qualification_completed') {
      const source = event.utmSource || 'unknown';
      const campaign = event.utmCampaign || 'unknown';
      utmSource[source] = (utmSource[source] ?? 0) + 1;
      utmCampaign[campaign] = (utmCampaign[campaign] ?? 0) + 1;
    }
  }

  const viewings = data.viewings.list();
  const byProject: Record<string, { projectId: number; name: string; count: number }> = {};
  for (const viewing of viewings) {
    const property = data.properties.getProperty(viewing.propertyId);
    if (!property) continue;
    const key = String(property.project.id);
    byProject[key] ??= { projectId: property.project.id, name: property.project.name, count: 0 };
    byProject[key].count += 1;
  }

  const qualified = data.profiles.listAll();
  const matchCounts = qualified.map((profile) => data.matches.listByProfile(profile.id).length);
  const averageMatches =
    matchCounts.length === 0 ? 0 : Math.round((matchCounts.reduce((sum, value) => sum + value, 0) / matchCounts.length) * 10) / 10;

  const propertyViewingConversion = Object.entries(viewed).map(([propertyId, views]) => {
    const requests = viewingsByProperty[Number(propertyId)] ?? 0;
    const property = data.properties.getProperty(Number(propertyId));
    return {
      propertyId: Number(propertyId),
      name: property ? `${property.project.name} ${property.unitNumber}` : propertyId,
      views,
      viewingRequests: requests,
      conversion: conversion(views, requests),
    };
  });

  const top = (record: Record<number, number>, limit = 5) =>
    Object.entries(record)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([propertyId, count]) => {
        const property = data.properties.getProperty(Number(propertyId));
        return {
          propertyId: Number(propertyId),
          name: property ? `${property.project.name} · ${property.unitNumber}` : propertyId,
          count,
        };
      });

  return {
    funnel: counts,
    conversions,
    temperature,
    mostViewed: top(viewed),
    mostFavorited: top(favorited),
    propertyViewingConversion,
    averageMatchesPerQualifiedLead: averageMatches,
    leadsByUtmSource: utmSource,
    leadsByUtmCampaign: utmCampaign,
    viewingRequestsByProject: Object.values(byProject),
  };
}
