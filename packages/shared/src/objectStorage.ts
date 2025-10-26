import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface ObjectStorageConfig {
  enabled: boolean;
  endpoint?: string;
  region?: string;
  forcePathStyle?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  publicUrl?: string;
  reportPrefix?: string;
  signedUrlExpirySeconds?: number;
}

export interface UploadJsonOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

/**
 * Thin wrapper around an S3-compatible object storage service (Hetzner, MinIO, etc.).
 * Designed to fail gracefully when disabled or misconfigured.
 */
export class ObjectStorageService {
  private readonly client: S3Client | null;
  private readonly bucket?: string;
  private readonly logger: Logger;
  private readonly enabled: boolean;
  private readonly publicUrl?: string;
  private readonly signedUrlExpirySeconds: number;

  constructor(private readonly config: ObjectStorageConfig, logger: Logger = console) {
    this.logger = logger;

    const hasCredentials = Boolean(
      config.accessKeyId &&
      config.secretAccessKey &&
      config.bucket
    );

    this.enabled = Boolean(config.enabled && hasCredentials);
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl?.replace(/\/+$/, '');
    this.signedUrlExpirySeconds = config.signedUrlExpirySeconds ?? 3600;

    if (!this.enabled) {
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: config.region ?? 'us-east-1',
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId as string,
        secretAccessKey: config.secretAccessKey as string,
      },
      maxAttempts: 3,
    });
  }

  isEnabled(): boolean {
    return this.enabled && !!this.client;
  }

  /**
   * Uploads a JSON payload to the configured bucket/key.
   */
  async uploadJson(key: string, payload: unknown, options: UploadJsonOptions = {}): Promise<boolean> {
    if (!this.isEnabled() || !this.client || !this.bucket) {
      return false;
    }

    try {
      const body = Buffer.from(JSON.stringify(payload));
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options.contentType ?? 'application/json',
        CacheControl: options.cacheControl ?? 'max-age=0, s-maxage=0',
        Metadata: options.metadata,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      this.logger.error({ error, key }, 'Failed to upload object to storage');
      return false;
    }
  }

  /**
   * Generates a pre-signed URL for downloading the object.
   */
  async generateSignedUrl(key: string, expiresInSeconds?: number): Promise<string | null> {
    if (!this.isEnabled() || !this.client || !this.bucket) {
      return null;
    }

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, getCommand, {
        expiresIn: expiresInSeconds ?? this.signedUrlExpirySeconds,
      });

      return signedUrl;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (status === 404) {
        return null;
      }
      this.logger.error({ error, key }, 'Failed to generate signed URL');
      return null;
    }
  }

  /**
   * Returns a public URL if configured (typically via CDN or static endpoint).
   */
  getPublicUrl(key: string): string | null {
    if (!this.publicUrl) {
      return null;
    }
    return `${this.publicUrl}/${key}`;
  }

  async deleteObject(key: string): Promise<boolean> {
    if (!this.isEnabled() || !this.client || !this.bucket) {
      return false;
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      this.logger.error({ error, key }, 'Failed to delete object from storage');
      return false;
    }
  }
}
