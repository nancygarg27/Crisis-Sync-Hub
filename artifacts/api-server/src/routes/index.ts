import { Router, type IRouter } from "express";
import healthRouter from "./health";
import incidentsRouter from "./incidents";
import floorRouter from "./floor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(incidentsRouter);
router.use(floorRouter);

export default router;
