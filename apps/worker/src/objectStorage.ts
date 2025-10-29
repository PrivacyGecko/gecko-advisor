// SPDX-License-Identifier: MIT
import { ObjectStorageService } from '@gecko-advisor/shared';
import { config } from './config.js';
import { logger } from './logger.js';

export const objectStorage = new ObjectStorageService(config.objectStorage, logger);
