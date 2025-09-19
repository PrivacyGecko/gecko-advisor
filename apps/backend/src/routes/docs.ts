import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { problem } from "../problem.js";

export const docsRouter = Router();

docsRouter.get('/openapi.yaml', async (_req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'infra', 'openapi.yaml');
    const buf = await readFile(filePath);
    res.type('text/yaml').send(buf);
  } catch (error) {
    return problem(res, 500, 'Failed to load OpenAPI document', error instanceof Error ? error.message : undefined);
  }
});
