import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth.js";
import dividasRouter from "./routes/dividas.js";
import pagamentosRouter from "./routes/pagamentos.js";
import devedoresRouter from "./routes/devedores.js";
import importarRouter from "./routes/importar.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api/dividas", authMiddleware, dividasRouter);
app.use("/api/pagamentos", authMiddleware, pagamentosRouter);
app.use("/api/devedores", authMiddleware, devedoresRouter);
app.use("/api/importar", authMiddleware, importarRouter);

export default app;
