import { Router } from "express";
import * as ctrl from "../controllers/devedoresController.js";

const router = Router();

router.get("/", ctrl.listar);
router.delete("/:id", ctrl.remover);

export default router;
