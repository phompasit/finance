import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { log } from "console";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // ✅ ปิด web security เพื่อให้โหลด file:// ได้
    },
  });

  // โหลด React app ที่ build แล้ว
  const indexPath = path.join(__dirname, "dist", "index.html");
  console.log("Loading index from:", indexPath);
  mainWindow.loadFile(indexPath);
}

function startBackend() {
  const isDev = !app.isPackaged;

  try {
    if (isDev) {
      const serverPath = path.join(__dirname, "server", "index.js");
      backendProcess = spawn("node", [serverPath], {
        stdio: "inherit",
        shell: true,
      });
    } else {
      const serverPath = path.join(
        process.resourcesPath,
        "app",
        "server",
        "index.js"
      );
      backendProcess = spawn(process.execPath, [serverPath], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });
      log.info("Backend started (PRODUCTION mode):", serverPath);
    }

    backendProcess.on("error", (err) => {
      console.error("Failed to start backend:", err);
    });

    console.log("Backend started successfully");
  } catch (error) {
    console.error("Error starting backend:", error);
  }
}
app.whenReady().then(() => {
  // 🔹 รัน backend server
  startBackend();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
  if (backendProcess) backendProcess.kill();
});
// // "main": "server/index.js",
    // "build:exe": "vite build && electron-builder",
    // "start": "electron ."