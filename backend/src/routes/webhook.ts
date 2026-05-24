import { Router } from "express";
import * as ctrl from "../controllers/webhookController.js";

const router = Router();

router.get("/cobrancas", ctrl.listarCobrancas);
router.post("/disparar", ctrl.disparar);

export default router;
