import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import franchisesRouter from "./franchises";
import usersRouter from "./users";
import catalogRouter from "./catalog";
import goalsRouter from "./goals";
import checkinsRouter from "./checkins";
import supportRouter from "./support";
import dashboardRouter from "./dashboard";
import exportsRouter from "./exports";
import krisRouter from "./kris";
import recruitingRouter from "./recruiting";
import recruitingAiRouter from "./recruiting-ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(franchisesRouter);
router.use(usersRouter);
router.use(catalogRouter);
router.use(goalsRouter);
router.use(checkinsRouter);
router.use(supportRouter);
router.use(dashboardRouter);
router.use(exportsRouter);
router.use(krisRouter);
router.use(recruitingRouter);
router.use(recruitingAiRouter);

export default router;
