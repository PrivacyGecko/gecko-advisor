import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  name: 'privacy-advisor-worker',
  level: config.logLevel,
});
