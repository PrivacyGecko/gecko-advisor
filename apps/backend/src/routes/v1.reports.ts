import { Router } from "express";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { etldPlusOne } from "@privacy-advisor/shared";
import { buildReportPayload } from "./v2.reports.js";

export const reportV1Router = Router();

const mapEvidenceToLegacy = (evidence: Array<{ kind: string } & Record<string, unknown>>) =>
  evidence.map(({ kind, ...rest }) => ({ ...rest, type: kind }));

reportV1Router.get(["/report/:slug", "/r/:slug"], async (req, res) => {
  const slug = req.params.slug;
  const scan = await prisma.scan.findUnique({ where: { slug } });
  if (!scan) {
    return problem(res, 404, "Report not found");
  }

  const payload = await buildReportPayload(scan);
  const legacyScan = { ...payload.scan, reportSlug: payload.scan.slug };
  const legacyEvidence = mapEvidenceToLegacy(payload.evidence as Array<{ kind: string } & Record<string, unknown>>);

  res.json({
    scan: legacyScan,
    evidence: legacyEvidence,
    meta: payload.meta,
  });
});

reportV1Router.get("/scan/:id", async (req, res) => {
  const scan = await prisma.scan.findUnique({ where: { id: req.params.id } });
  if (!scan) {
    return problem(res, 404, "Scan not found");
  }

  const payload = await buildReportPayload(scan);

  res.json({
    scan: { ...payload.scan, reportSlug: payload.scan.slug },
    evidence: mapEvidenceToLegacy(payload.evidence as Array<{ kind: string } & Record<string, unknown>>),
    meta: payload.meta,
  });
});

reportV1Router.get("/reports/recent", async (_req, res) => {
  const scans = await prisma.scan.findMany({
    where: { status: "done" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      slug: true,
      input: true,
      score: true,
      label: true,
      createdAt: true,
    },
  });

  const items = scans.map((scan) => {
    let domain = scan.input;
    try {
      const url = new URL(scan.input);
      domain = etldPlusOne(url.hostname);
    } catch {
      // ignore
    }
    return {
      reportSlug: scan.slug,
      score: scan.score ?? 0,
      label: scan.label ?? "Caution",
      domain,
      createdAt: scan.createdAt,
    };
  });

  res.json({ items });
});