import { Router } from "express";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { etldPlusOne, buildReportPayload, type ReportEvidence } from "@gecko-advisor/shared";

export const reportV1Router = Router();

const mapEvidenceToLegacy = (evidence: ReportEvidence[]): Array<Record<string, unknown>> =>
  evidence.map((item) => {
    const { kind, ...rest } = item;
    return {
      ...rest,
      type: kind ?? 'unknown',
    } as Record<string, unknown>;
  });

reportV1Router.get(["/report/:slug", "/r/:slug"], async (req, res) => {
  try {
    const slug = req.params.slug;
    const scan = await prisma.scan.findUnique({
      where: { slug },
      include: {
        evidence: { orderBy: { createdAt: 'asc' } },
        issues: { orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!scan) {
      return problem(res, 404, "Report not found");
    }

    const payload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });
    const legacyScan = { ...payload.scan, reportSlug: payload.scan.slug };
    const legacyEvidence = mapEvidenceToLegacy(payload.evidence);

    res.json({
      scan: legacyScan,
      evidence: legacyEvidence,
      meta: payload.meta,
    });
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error fetching report (v1)');
    return problem(res, 500, 'Failed to load report');
  }
});

reportV1Router.get("/scan/:id", async (req, res) => {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: req.params.id },
      include: {
        evidence: { orderBy: { createdAt: 'asc' } },
        issues: { orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!scan) {
      return problem(res, 404, "Scan not found");
    }

    const payload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });

    res.json({
      scan: { ...payload.scan, reportSlug: payload.scan.slug },
      evidence: mapEvidenceToLegacy(payload.evidence),
      meta: payload.meta,
    });
  } catch (error) {
    logger.error({ error, scanId: req.params.id }, 'Error fetching scan report (v1)');
    return problem(res, 500, 'Failed to load scan report');
  }
});

reportV1Router.get("/reports/recent", async (_req, res) => {
  try {
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
  } catch (error) {
    logger.error({ error }, 'Error fetching recent reports (v1)');
    return problem(res, 500, 'Failed to load recent reports');
  }
});
