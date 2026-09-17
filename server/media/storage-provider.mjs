import { MediaStorageProvider, mediaStorageNotConfiguredError } from './media-storage-base.mjs';
import { R2MediaStorageProvider } from './r2-storage-provider.mjs';

export { MediaStorageProvider, mediaStorageNotConfiguredError };

/**
 * The safe default: every method is a no-op or returns an
 * "unconfigured"-shaped result rather than throwing, EXCEPT the mutating
 * ones (upload/delete/getSignedUrl), which fail loudly with a recognizable
 * error code - so an admin flow that forgets to check isConfigured() first
 * gets a clear error instead of silently pretending to have uploaded
 * something. Nothing in the current lookup routes calls any of these.
 */
export class NullMediaStorageProvider extends MediaStorageProvider {
  isConfigured() {
    return false;
  }
  async upload() {
    throw mediaStorageNotConfiguredError();
  }
  async delete() {
    throw mediaStorageNotConfiguredError();
  }
  getUrl() {
    return null;
  }
  async getSignedUrl() {
    throw mediaStorageNotConfiguredError();
  }
  async exists() {
    return false;
  }
  async getMetadata() {
    return null;
  }
}

function parseBool(value) {
  if (typeof value === 'boolean') return value;
  const s = String(value == null ? '' : value).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

let cachedProvider = null;

/**
 * Picks the storage backend from environment variables. Never throws and
 * never requires configuration to be present - an unconfigured environment
 * (the default for local dev and for any deploy that hasn't set up a
 * bucket yet) resolves to NullMediaStorageProvider, and the rest of the
 * app keeps working exactly as if the media system didn't exist.
 */
export function getMediaStorageProvider(env = process.env) {
  if (cachedProvider) return cachedProvider;
  cachedProvider = buildProvider(env);
  return cachedProvider;
}

/** Test-only: forces the next getMediaStorageProvider() call to rebuild from env. */
export function resetMediaStorageProviderCache() {
  cachedProvider = null;
}

function buildProvider(env) {
  if (!parseBool(env.MEDIA_STORAGE_ENABLED)) return new NullMediaStorageProvider();
  const providerName = String(env.MEDIA_STORAGE_PROVIDER || '').trim().toLowerCase();
  if (providerName === 'r2' || providerName === 's3') {
    const provider = new R2MediaStorageProvider(env);
    if (provider.isConfigured()) return provider;
  }
  return new NullMediaStorageProvider();
}
