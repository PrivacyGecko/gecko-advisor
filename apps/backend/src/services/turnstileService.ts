import type { Logger } from 'pino';
import { config } from '../config.js';
import { logger } from '../logger.js';

const DEFAULT_VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyRequest {
  token: string;
  remoteIp?: string | null;
  userAgent?: string | null;
}

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

interface TurnstileConfig {
  enabled: boolean;
  secretKey?: string;
  siteKey?: string;
  verifyEndpoint?: string;
}

export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
  hostname?: string;
  action?: string;
}

export class TurnstileService {
  private readonly enabled: boolean;
  private readonly secretKey?: string;
  private readonly verifyEndpoint: string;
  private readonly logger: Logger;

  constructor(private readonly turnstileConfig: TurnstileConfig, loggerInstance: Logger) {
    this.enabled = Boolean(turnstileConfig.enabled && turnstileConfig.secretKey);
    this.secretKey = turnstileConfig.secretKey;
    this.verifyEndpoint = turnstileConfig.verifyEndpoint ?? DEFAULT_VERIFY_ENDPOINT;
    this.logger = loggerInstance;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async verify(request: TurnstileVerifyRequest): Promise<TurnstileVerificationResult> {
    if (!this.enabled || !this.secretKey) {
      return { success: true };
    }

    const params = new URLSearchParams({
      secret: this.secretKey,
      response: request.token,
    });

    if (request.remoteIp) {
      params.append('remoteip', request.remoteIp);
    }

    try {
      const response = await fetch(this.verifyEndpoint, {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        this.logger.warn(
          {
            status: response.status,
            remoteIp: request.remoteIp,
            userAgent: request.userAgent,
          },
          'Turnstile verification HTTP error',
        );
        return {
          success: false,
          errorCodes: [`http_${response.status}`],
        };
      }

      const data = (await response.json()) as TurnstileVerifyResponse;
      if (!data.success) {
        this.logger.warn(
          {
            errorCodes: data['error-codes'],
            hostname: data.hostname,
            remoteIp: request.remoteIp,
            userAgent: request.userAgent,
          },
          'Turnstile verification failed',
        );
        return {
          success: false,
          errorCodes: data['error-codes'],
          hostname: data.hostname,
          action: data.action,
        };
      }

      return {
        success: true,
        hostname: data.hostname,
        action: data.action,
      };
    } catch (error) {
      this.logger.error(
        {
          error,
          remoteIp: request.remoteIp,
          userAgent: request.userAgent,
        },
        'Turnstile verification exception',
      );
      return {
        success: false,
        errorCodes: ['exception'],
      };
    }
  }
}

export const turnstileService = new TurnstileService(config.turnstile, logger);
