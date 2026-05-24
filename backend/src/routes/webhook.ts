import { Router } from "express";
import * as ctrl from "../controllers/webhookController.js";

const router = Router();

router.post("/disparar", ctrl.disparar);

export default router;
