/**
 * Prepara o backend para inclusão no instalador.
 * Compila o backend, copia dist, node_modules e .env.example para backend-bundle/
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const BACKEND = path.join(ROOT, "backend");
const BUNDLE = path.join(ROOT, "frontend", "backend-bundle");

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("[prepare-backend] Compilando backend...");
execSync("npm run build", { cwd: BACKEND, stdio: "inherit" });

console.log("[prepare-backend] Criando bundle...");
rmDir(BUNDLE);
fs.mkdirSync(BUNDLE, { recursive: true });

// Copiar dist
copyDir(path.join(BACKEND, "dist"), path.join(BUNDLE, "dist"));

// Copiar package.json
fs.copyFileSync(
  path.join(BACKEND, "package.json"),
  path.join(BUNDLE, "package.json")
);

// Instalar apenas dependências de produção no bundle
console.log("[prepare-backend] Instalando dependências de produção...");
execSync("npm install --omit=dev", {
  cwd: BUNDLE,
  stdio: "inherit",
});

// Criar .env no bundle com credenciais do Supabase (embutidas no instalador)
const bundleEnvPath = path.join(BUNDLE, ".env");
const backendEnvPath = path.join(BACKEND, ".env");
const envBuildPath = path.join(ROOT, "frontend", ".env.build");

if (fs.existsSync(backendEnvPath)) {
  fs.copyFileSync(backendEnvPath, bundleEnvPath);
  console.log("[prepare-backend] .env copiado do backend");
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  fs.writeFileSync(
    bundleEnvPath,
    `SUPABASE_URL=${process.env.SUPABASE_URL}\nSUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY}\n`
  );
  console.log("[prepare-backend] .env criado a partir de variáveis de ambiente");
} else if (fs.existsSync(envBuildPath)) {
  fs.copyFileSync(envBuildPath, bundleEnvPath);
  console.log("[prepare-backend] .env criado a partir de frontend/.env.build");
} else {
  console.error(
    "[prepare-backend] ERRO: Credenciais do Supabase não encontradas.\n" +
      "  Configure backend/.env ou frontend/.env.build com SUPABASE_URL e SUPABASE_ANON_KEY,\n" +
      "  ou defina as variáveis de ambiente antes do build."
  );
  process.exit(1);
}

console.log("[prepare-backend] Bundle criado em frontend/backend-bundle/");
