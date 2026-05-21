import { Router } from "express";
import * as ctrl from "../controllers/pagamentosController.js";

const router = Router();

router.post("/", ctrl.registrar);
router.get("/divida/:dividaId", ctrl.listarPorDivida);
router.delete("/:id", ctrl.remover);

export default router;
