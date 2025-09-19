import { Router } from "express";
import { scanV1Router } from "./v1.scan.js";
import { reportV1Router } from "./v1.reports.js";
import { scanV2Router } from "./v2.scan.js";
import { reportV2Router } from "./v2.reports.js";

export const apiV1Router = Router();
apiV1Router.use('/scan', scanV1Router);
apiV1Router.use('/', reportV1Router);

export const apiV2Router = Router();
apiV2Router.use('/scan', scanV2Router);
apiV2Router.use('/', reportV2Router);
