import { app, BrowserWindow } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

let backendProcess: ChildProcess | null = null;

function getBackendPath(): string | null {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend");
  }
  return path.join(__dirname, "../../../backend");
}

function startBackend(): void {
  const backendPath = getBackendPath();
  if (!backendPath) return;

  const distPath = path.join(backendPath, "dist", "index.js");
  const fs = require("fs");
  if (!fs.existsSync(distPath)) return;

  const exec = app.isPackaged ? process.execPath : "node";
  const args = [distPath];
  const env: NodeJS.ProcessEnv = app.isPackaged
    ? { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
    : { ...process.env };

  backendProcess = spawn(exec, args, {
    cwd: backendPath,
    env,
    stdio: "pipe",
  });

  backendProcess.on("error", (err) => {
    console.error("[Backend] Erro ao iniciar:", err);
  });

  backendProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error("[Backend] Processo encerrado com código:", code);
    }
  });
}

function stopBackend(): void {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Sistema de Cobrança",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  startBackend();
  if (app.isPackaged) {
    await new Promise((r) => setTimeout(r, 1500));
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopBackend();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});
