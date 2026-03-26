import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import trucksRouter from "./trucks";
import menuItemsRouter from "./menuItems";
import schedulesRouter from "./schedules";
import eventsRouter from "./events";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(trucksRouter);
router.use(menuItemsRouter);
router.use(schedulesRouter);
router.use(eventsRouter);
router.use(adminRouter);

export default router;
