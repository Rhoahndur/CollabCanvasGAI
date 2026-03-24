import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const VALID_ENV = {
  VITE_FIREBASE_API_KEY: 'AIzaSyTest123',
  VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123:web:abc123',
  VITE_FIREBASE_DATABASE_URL: 'https://test-default-rtdb.firebaseio.com',
};

function stubAllEnvVars(overrides = {}) {
  const env = { ...VALID_ENV, ...overrides };
  Object.entries(env).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
}

describe('validateEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns validated env when all vars are present', async () => {
    stubAllEnvVars();
    const { validateEnv } = await import('../../utils/envValidation');
    const result = validateEnv();
    expect(result.VITE_FIREBASE_API_KEY).toBe(VALID_ENV.VITE_FIREBASE_API_KEY);
    expect(result.VITE_FIREBASE_DATABASE_URL).toBe(VALID_ENV.VITE_FIREBASE_DATABASE_URL);
  });

  it('throws when API key is empty', async () => {
    stubAllEnvVars({ VITE_FIREBASE_API_KEY: '' });
    const { validateEnv } = await import('../../utils/envValidation');
    expect(() => validateEnv()).toThrow('Environment validation failed');
  });

  it('throws when database URL is not a valid URL', async () => {
    stubAllEnvVars({ VITE_FIREBASE_DATABASE_URL: 'not-a-url' });
    const { validateEnv } = await import('../../utils/envValidation');
    expect(() => validateEnv()).toThrow('valid URL');
  });

  it('error message lists the missing fields', async () => {
    const { validateEnv } = await import('../../utils/envValidation');
    try {
      validateEnv();
    } catch (e) {
      expect(e.message).toContain('VITE_FIREBASE_API_KEY');
    }
  });

  it('throws when project ID is empty', async () => {
    stubAllEnvVars({ VITE_FIREBASE_PROJECT_ID: '' });
    const { validateEnv } = await import('../../utils/envValidation');
    expect(() => validateEnv()).toThrow('Environment validation failed');
  });

  it('returns all 7 validated fields', async () => {
    stubAllEnvVars();
    const { validateEnv } = await import('../../utils/envValidation');
    const result = validateEnv();
    expect(Object.keys(result)).toHaveLength(7);
  });
});
