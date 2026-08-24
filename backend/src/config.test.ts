import { describe, expect, it } from 'vitest';
import { environmentPaths, isDemoAdminPreviewEnabled } from './config.js';
import path from 'node:path';

describe('config helpers', () => {
  it('loads the repository .env when backend runs as an npm workspace', () => {
    expect(environmentPaths('/workspace/project/backend')).toEqual([
      path.resolve('/workspace/project/backend/.env'),
      path.resolve('/workspace/project/.env'),
    ]);
  });
  it('enables demo admin only when demo mode and feature flag are on', () => {
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: true,
        features: { demoAdminPreview: true },
      }),
    ).toBe(true);
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: false,
        features: { demoAdminPreview: true },
      }),
    ).toBe(false);
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: true,
        features: { demoAdminPreview: false },
      }),
    ).toBe(false);
  });
});
