import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl as presignS3Url } from '@aws-sdk/s3-request-presigner';
import { MediaStorageProvider, mediaStorageNotConfiguredError } from './media-storage-base.mjs';

const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function isNotFound(err) {
  if (!err) return false;
  const status = err.$metadata && err.$metadata.httpStatusCode;
  return err.name === 'NotFound' || err.name === 'NoSuchKey' || status === 404;
}

/**
 * Cloudflare R2 (S3-compatible) storage provider. R2 speaks the S3 API, so
 * this uses the standard AWS SDK v3 S3 client pointed at R2's endpoint -
 * no R2-specific SDK needed, and the same class works against any other
 * S3-compatible bucket by changing MEDIA_STORAGE_ENDPOINT/PROVIDER.
 *
 * Credentials never leave this file: the S3Client is constructed once,
 * server-side, from environment variables (see .env.example), and nothing
 * here is ever imported by frontend code.
 */
export class R2MediaStorageProvider extends MediaStorageProvider {
  constructor(env = process.env) {
    super();
    this.bucket = String(env.MEDIA_STORAGE_BUCKET || '').trim();
    this.publicBaseUrl = String(env.MEDIA_STORAGE_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
    const endpoint = String(env.MEDIA_STORAGE_ENDPOINT || '').trim();
    const accessKeyId = String(env.MEDIA_STORAGE_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = String(env.MEDIA_STORAGE_SECRET_ACCESS_KEY || '').trim();
    this._configured = !!(this.bucket && endpoint && accessKeyId && secretAccessKey);
    this.client = this._configured
      ? new S3Client({
          region: 'auto',
          endpoint,
          credentials: { accessKeyId, secretAccessKey }
        })
      : null;
  }

  isConfigured() {
    return this._configured;
  }

  _requireConfigured() {
    if (!this._configured) throw mediaStorageNotConfiguredError();
  }

  async upload(key, buffer, opts = {}) {
    this._requireConfigured();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: opts.contentType || 'application/octet-stream',
        CacheControl: opts.cacheControl || DEFAULT_CACHE_CONTROL
      })
    );
    return { key, url: this.getUrl(key) };
  }

  async delete(key) {
    this._requireConfigured();
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  getUrl(key) {
    if (!this.publicBaseUrl || !key) return null;
    return this.publicBaseUrl + '/' + String(key).replace(/^\/+/, '');
  }

  async getSignedUrl(key, opts = {}) {
    this._requireConfigured();
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const expiresIn = Math.min(3600, Math.max(60, Number(opts.expiresInSeconds) || 300));
    return presignS3Url(this.client, command, { expiresIn });
  }

  async exists(key) {
    if (!this._configured) return false;
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async getMetadata(key) {
    if (!this._configured) return null;
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        contentType: res.ContentType || null,
        contentLength: res.ContentLength != null ? Number(res.ContentLength) : null,
        lastModified: res.LastModified || null,
        etag: res.ETag || null
      };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }
}
