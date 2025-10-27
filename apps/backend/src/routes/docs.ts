import type { RequestHandler } from "express";
import { Router } from "express";
import basicAuth from "basic-auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { problem } from "../problem.js";
import { config } from "../config.js";

export const docsRouter = Router();

const shouldProtectDocs = config.appEnv === 'stage' || config.appEnv === 'production';

const docsAuthGuard: RequestHandler = (req, res, next) => {
  if (!shouldProtectDocs) {
    next();
    return;
  }

  const credentials = basicAuth(req);
  const user = credentials?.name ?? '';
  const pass = credentials?.pass ?? '';
  const expectedUser = process.env.DOCS_USER;
  const expectedPass = process.env.DOCS_PASS;

  if (expectedUser && expectedPass && user === expectedUser && pass === expectedPass) {
    next();
    return;
  }

  res.set('WWW-Authenticate', 'Basic realm="docs"');
  res.status(401).send('Authentication required');
};

docsRouter.get('/', docsAuthGuard, (_req, res) => {
  res.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Privacy Advisor API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener('DOMContentLoaded', function () {
        SwaggerUIBundle({
          url: 'openapi.yaml',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
        });
      });
    </script>
  </body>
</html>`);
});

docsRouter.get('/openapi.yaml', docsAuthGuard, async (_req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'infra', 'openapi.yaml');
    const buf = await readFile(filePath);
    res.type('text/yaml').send(buf);
  } catch (error) {
    return problem(
      res,
      500,
      'Failed to load OpenAPI document',
      error instanceof Error ? error.message : undefined,
    );
  }
});
