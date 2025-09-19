import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Locals {
    requestId?: string;
    cspNonce?: string;
  }
}
