import { Router } from "express";
import * as ctrl from "../controllers/dividasController.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/:id", ctrl.buscarPorId);
router.post("/", ctrl.criar);
router.put("/:id", ctrl.atualizar);
router.delete("/:id", ctrl.remover);

export default router;
