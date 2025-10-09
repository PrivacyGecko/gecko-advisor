#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import YAML from "yaml";
import {
  UrlScanRequestSchema,
  AppScanRequestSchema,
  AddressScanRequestSchema,
  ScanQueuedResponseSchema,
  ScanStatusSchema,
  ReportResponseSchema,
  RecentReportsResponseSchema,
} from "@privacy-advisor/shared";
import { z } from "zod";

const schemas = {
  UrlScanRequest: zodToJsonSchema(UrlScanRequestSchema, "UrlScanRequest", { target: "openApi3" }),
  AppScanRequest: zodToJsonSchema(AppScanRequestSchema, "AppScanRequest", { target: "openApi3" }),
  AddressScanRequest: zodToJsonSchema(AddressScanRequestSchema, "AddressScanRequest", { target: "openApi3" }),
  ScanQueuedResponse: zodToJsonSchema(ScanQueuedResponseSchema, "ScanQueuedResponse", { target: "openApi3" }),
  ScanStatus: zodToJsonSchema(ScanStatusSchema, "ScanStatus", { target: "openApi3" }),
  ReportResponse: zodToJsonSchema(ReportResponseSchema, "ReportResponse", { target: "openApi3" }),
  RecentReportsResponse: zodToJsonSchema(RecentReportsResponseSchema, "RecentReportsResponse", { target: "openApi3" }),
  ProblemDetails: zodToJsonSchema(
    z.object({
      type: z.string().optional(),
      title: z.string(),
      status: z.number(),
      detail: z.any().optional(),
    }),
    "ProblemDetails",
    { target: "openApi3" },
  ),
  RateLimitedResponse: zodToJsonSchema(
    z.object({
      error: z.literal("rate_limited"),
      retryAfterMs: z.number(),
    }),
    "RateLimitedResponse",
    { target: "openApi3" },
  ),
};

const $ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const problemResponses = {
  400: {
    description: "Bad Request",
    content: {
      "application/json": {
        schema: $ref("ProblemDetails"),
      },
    },
  },
  404: {
    description: "Not Found",
    content: {
      "application/json": {
        schema: $ref("ProblemDetails"),
      },
    },
  },
  429: {
    description: "Rate Limited",
    content: {
      "application/json": {
        schema: $ref("RateLimitedResponse"),
      },
    },
  },
  500: {
    description: "Server Error",
    content: {
      "application/json": {
        schema: $ref("ProblemDetails"),
      },
    },
  },
};

const document = {
  openapi: "3.0.3",
  info: {
    title: "Privacy Advisor API",
    version: "2.0.0",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/v2/scan/url": {
      post: {
        summary: "Queue a URL scan",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: $ref("UrlScanRequest"),
            },
          },
        },
        responses: {
          202: {
            description: "Scan queued",
            content: {
              "application/json": {
                schema: $ref("ScanQueuedResponse"),
              },
            },
          },
          ...problemResponses,
        },
      },
    },
    "/api/v2/scan/{id}/status": {
      get: {
        summary: "Retrieve scan status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Scan identifier",
          },
        ],
        responses: {
          200: {
            description: "Status",
            content: {
              "application/json": {
                schema: $ref("ScanStatus"),
              },
            },
          },
          ...problemResponses,
        },
      },
    },
    "/api/v2/scan/app": {
      post: {
        summary: "Queue an app scan (stub)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: $ref("AppScanRequest"),
            },
          },
        },
        responses: {
          202: {
            description: "Scan queued",
            content: {
              "application/json": {
                schema: $ref("ScanQueuedResponse"),
              },
            },
          },
          ...problemResponses,
        },
      },
    },
    "/api/v2/scan/address": {
      post: {
        summary: "Queue an address scan (stub)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: $ref("AddressScanRequest"),
            },
          },
        },
        responses: {
          202: {
            description: "Scan queued",
            content: {
              "application/json": {
                schema: $ref("ScanQueuedResponse"),
              },
            },
          },
          ...problemResponses,
        },
      },
    },
    "/api/v2/report/{slug}": {
      get: {
        summary: "Fetch report by slug",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Report",
            content: {
              "application/json": {
                schema: $ref("ReportResponse"),
              },
            },
          },
          ...problemResponses,
        },
      },
    },
    "/api/v2/reports/recent": {
      get: {
        summary: "Recent public reports",
        responses: {
          200: {
            description: "Recent reports",
            content: {
              "application/json": {
                schema: $ref("RecentReportsResponse"),
              },
            },
          },
          ...problemResponses,
        },
      },
    },
  },
  components: {
    schemas,
  },
};

const outputPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../infra/openapi.yaml');
writeFileSync(outputPath, YAML.stringify(document));
console.log(`OpenAPI document written to ${outputPath}`);

