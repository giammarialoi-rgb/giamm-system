/**
 * MediaStorageProvider - the abstract contract every storage backend
 * implements, so the rest of the app (routes, services) never depends on
 * Cloudflare R2 (or any other bucket) directly. Swapping R2 for Supabase
 * Storage, S3, or anything else later means writing one new provider class,
 * not touching the media service, routes, or frontend.
 *
 * Kept in its own file (not storage-provider.mjs) so both the null
 * provider and every real provider (e.g. r2-storage-provider.mjs) can
 * import it without a circular import between storage-provider.mjs (the
 * factory) and the provider implementations it picks between.
 *
 * Every method here is what a future admin upload/replace/delete flow will
 * call (section 17 of the media architecture task) - none of it is wired
 * to an HTTP route yet; the exercise/warmup media *lookup* routes that are
 * live in this phase never touch storage at all (they only read
 * already-persisted metadata from the exercise_media table).
 */
export class MediaStorageProvider {
  /** @returns {boolean} whether this provider has real, usable credentials. */
  isConfigured() {
    return false;
  }

  /** Upload a buffer to `key`. Returns { key, url }. */
  async upload(_key, _buffer, _opts = {}) {
    throw notImplemented();
  }

  /** Delete the object at `key`. */
  async delete(_key) {
    throw notImplemented();
  }

  /** Synchronous public URL for `key`, or null if there is none (private bucket / not configured). */
  getUrl(_key) {
    return null;
  }

  /** A time-limited signed URL for `key`, for private media (not used by any public exercise asset today). */
  async getSignedUrl(_key, _opts = {}) {
    throw notImplemented();
  }

  /** @returns {boolean} whether an object exists at `key`. */
  async exists(_key) {
    return false;
  }

  /** Object metadata (contentType/contentLength/lastModified/etag), or null if missing. */
  async getMetadata(_key) {
    return null;
  }
}

function notImplemented() {
  return new Error('MediaStorageProvider method not implemented');
}

export function mediaStorageNotConfiguredError() {
  const err = new Error('MEDIA_STORAGE_NOT_CONFIGURED');
  err.code = 'MEDIA_STORAGE_NOT_CONFIGURED';
  return err;
}
