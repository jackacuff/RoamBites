import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import trucksRouter from "./trucks";
import menuItemsRouter from "./menuItems";
import schedulesRouter from "./schedules";
import eventsRouter from "./events";
import adminRouter from "./admin";
import reviewsRouter from "./reviews";
import favoritesRouter from "./favorites";
import notificationsRouter from "./notifications";
import reservationsRouter from "./reservations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(trucksRouter);
router.use(menuItemsRouter);
router.use(schedulesRouter);
router.use(eventsRouter);
router.use(adminRouter);
router.use(reviewsRouter);
router.use(favoritesRouter);
router.use(notificationsRouter);
router.use(reservationsRouter);

export default router;
