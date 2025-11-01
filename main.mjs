// import { app, BrowserWindow } from "electron";
// import path from "path";
// import { fileURLToPath } from "url";
// import { spawn } from "child_process";
// import { existsSync } from "fs";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// let mainWindow;
// let serverProcess;

// const isDev = process.env.NODE_ENV === "development";

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//   });

//   if (isDev) {
//     mainWindow.loadURL("http://localhost:5173"); // Dev mode
//   } else {
//     const indexPath = path.join(__dirname, "./dist/index.html"); // Production build
//     if (existsSync(indexPath)) {
//       mainWindow.loadFile(indexPath);
//     } else {
//       console.error("❌ Dist folder not found:", indexPath);
//     }
//   }

//   mainWindow.on("closed", () => {
//     mainWindow = null;
//   });
// }
// mainWindow.webContents.openDevTools();
// function startServer() {
//   const serverPath = path.join(__dirname, "server", "index.js");
//   serverProcess = spawn("node", [serverPath], {
//     stdio: "inherit",
//     shell: true,
//   });
// }
// console.log("🧭 isDev:", isDev);
// console.log("📂 Current directory:", __dirname);
// console.log(
//   "📄 Loading file from:",
//   isDev ? "http://localhost:5173" : path.join(__dirname, "dist", "index.html")
// );
// app.whenReady().then(() => {
//   startServer();
//   createWindow();
// });

// app.on("window-all-closed", () => {
//   if (serverProcess) {
//     console.log("🛑 Stopping server...");
//     serverProcess.kill();
//   }
//   if (process.platform !== "darwin") app.quit();
// });
