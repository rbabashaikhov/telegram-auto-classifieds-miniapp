import { describe, expect, it } from 'vitest';
import type { UserConfig } from 'vite';
import viteConfig from '../../vite.config';

describe('development proxy', () => {
  it('serves both API and uploaded listing images through the backend', () => {
    const config = viteConfig as UserConfig;
    expect(config.server?.proxy).toHaveProperty('/api');
    expect(config.server?.proxy).toHaveProperty('/uploads');
  });
});
