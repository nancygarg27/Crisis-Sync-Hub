import { Router, type IRouter } from "express";
import { getFloorMap, listStaff } from "../lib/store";

const router: IRouter = Router();

router.get("/floor-map", (_req, res) => {
  res.json(getFloorMap());
});

router.get("/staff", (_req, res) => {
  res.json(listStaff());
});

export default router;
