import "express-serve-static-core";
import type { SafeUser } from "../services/authService.js";

declare module "express-serve-static-core" {
  interface Locals {
    requestId?: string;
    cspNonce?: string;
  }

  interface Request {
    user?: SafeUser;
  }
}
