// SPDX-License-Identifier: MIT
import { buildReportStorageKey } from '@gecko-advisor/shared';
import { config } from '../config.js';
import { objectStorage } from '../storage/objectStorage.js';

export function getReportStorageKey(scanId: string): string {
  return buildReportStorageKey(scanId, {
    prefix: config.objectStorage.reportPrefix ?? 'reports/',
  });
}

export async function getReportDownloadUrl(scanId: string): Promise<{ url: string; expiresInSeconds: number } | null> {
  if (!objectStorage.isEnabled()) {
    return null;
  }

  const key = getReportStorageKey(scanId);
  const publicUrl = objectStorage.getPublicUrl(key);
  if (publicUrl) {
    return {
      url: publicUrl,
      expiresInSeconds: 0,
    };
  }

  const signedUrl = await objectStorage.generateSignedUrl(key, config.objectStorage.signedUrlExpirySeconds);
  if (!signedUrl) {
    return null;
  }

  return {
    url: signedUrl,
    expiresInSeconds: config.objectStorage.signedUrlExpirySeconds ?? 3600,
  };
}
