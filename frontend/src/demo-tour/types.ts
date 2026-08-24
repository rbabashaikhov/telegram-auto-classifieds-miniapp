export type TourPlacement = 'top' | 'bottom' | 'auto';

export type TourAction =
  | 'open-listing'
  | 'open-seller-cabinet'
  | 'open-editor-details'
  | 'open-editor-preview'
  | 'open-editor-payment'
  | 'open-moderation'
  | 'open-demo-admin';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  route?: string;
  placement?: TourPlacement;
  action?: TourAction;
  waitMs?: number;
  nextLabel?: string;
  scrollBlock?: ScrollLogicalPosition;
}

export interface DemoTourDefinition {
  id: string;
  storageKey: string;
  steps: TourStep[];
  intro: {
    title: string;
    lead: string;
    bullets: string[];
    startLabel: string;
    skipLabel: string;
  };
  finish: {
    title: string;
    lead: string;
    bullets: string[];
    adminLabel: string;
    continueLabel: string;
  };
}
