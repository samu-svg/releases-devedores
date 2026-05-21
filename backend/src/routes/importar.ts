import { Router } from "express";
import * as ctrl from "../controllers/importarController.js";

const router = Router();

router.post("/csv", ctrl.importarCsv);

export default router;
