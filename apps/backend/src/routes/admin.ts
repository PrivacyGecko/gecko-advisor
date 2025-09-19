import { Router } from "express";
import { adminGuard } from "../middleware/admin.js";
import { loadDemoLists } from "../lists.js";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";

export const adminRouter = Router();

adminRouter.post('/admin/refresh-lists', adminGuard, async (_req, res) => {
  try {
    const loaded = await loadDemoLists();
    await prisma.cachedList.deleteMany({});
    for (const list of loaded) {
      await prisma.cachedList.create({ data: list });
    }
    res.json({ ok: true, sources: loaded.map((list) => list.source) });
  } catch (error) {
    return problem(res, 500, 'Failed to refresh lists', error instanceof Error ? error.message : undefined);
  }
});
