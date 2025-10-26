import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess;
let mainWindow;


const userDataPath = app.getPath('userData');
const logFile = path.join(userDataPath, 'debug.log');

try {
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
} catch (e) {}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

log('=== App Starting ===');
log('User data path: ' + userDataPath);
log('Log file: ' + logFile);
log('Is packaged: ' + app.isPackaged);
log('__dirname: ' + __dirname);
log('__filename: ' + __filename);
log('Process cwd: ' + process.cwd());
log('Process execPath: ' + process.execPath);
log('App path: ' + app.getAppPath());

function startServer() {
  log('=== Starting Server ===');
  
  try {
    const isDev = !app.isPackaged;
    const serverPath = path.join(__dirname, 'server/index.js');
    
    log('Server path: ' + serverPath);
    log('Server exists: ' + fs.existsSync(serverPath));

    if (fs.existsSync(serverPath)) {
      const env = {
        ...process.env,
        NODE_ENV: 'production'
      };
      
      serverProcess = spawn(process.execPath, [serverPath], {
        stdio: 'inherit',
        shell: true,
        env: env,
        cwd: __dirname
      });

      serverProcess.on('error', (error) => {
        log('Server spawn error: ' + error.message);
      });

      serverProcess.on('exit', (code, signal) => {
        log('Server exited - code: ' + code + ', signal: ' + signal);
      });

      log('Server process started (PID: ' + serverProcess.pid + ')');
    } else {
      log('ERROR: Server file not found!');
    }
  } catch (error) {
    log('ERROR starting server: ' + error.message);
    log('Stack: ' + error.stack);
  }
}

function createWindow() {
  log('=== Creating Window ===');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      show: false,
      backgroundColor: '#ffffff'
    });

    log('BrowserWindow created');

    const isDev = !app.isPackaged;
    let indexPath;
    
    if (isDev) {
      indexPath = 'http://localhost:5173';
      log('Dev mode - Loading: ' + indexPath);
      mainWindow.loadURL(indexPath);
      mainWindow.webContents.openDevTools();
    } else {
      // Production - ลองหาไฟล์ index.html
      const possiblePaths = [
        path.join(__dirname, 'dist/index.html'),
        path.join(process.resourcesPath, 'app.asar.unpacked/dist/index.html'),
        path.join(process.resourcesPath, 'app/dist/index.html'),
        path.join(app.getAppPath(), 'dist/index.html')
      ];
      
      log('Searching for index.html...');
      for (const p of possiblePaths) {
        log('Checking: ' + p);
        if (fs.existsSync(p)) {
          indexPath = p;
          log('✓ Found index.html at: ' + indexPath);
          break;
        } else {
          log('✗ Not found');
        }
      }
      
      if (indexPath) {
        log('Loading file: ' + indexPath);
        mainWindow.loadFile(indexPath)
          .then(() => {
            log('loadFile completed successfully');
          })
          .catch(err => {
            log('loadFile error: ' + err.message);
          });
      } else {
        log('ERROR: index.html not found in any location!');
        
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error</title>
            <style>
              body { font-family: Arial; padding: 40px; background: #f5f5f5; }
              h1 { color: #d32f2f; }
              pre { background: white; padding: 20px; border-radius: 8px; overflow: auto; }
            </style>
          </head>
          <body>
            <h1>Error: Cannot find index.html</h1>
            <p>Check log file at:</p>
            <pre>${logFile}</pre>
            <p>__dirname: ${__dirname}</p>
            <p>App path: ${app.getAppPath()}</p>
          </body>
          </html>
        `));
      }
    }

    // Event listeners
    mainWindow.webContents.on('did-start-loading', () => {
      log('Page started loading');
    });

    mainWindow.webContents.on('did-finish-load', () => {
      log('Page finished loading - showing window');
      mainWindow.show();
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      log('Failed to load page!');
      log('Error code: ' + errorCode);
      log('Description: ' + errorDescription);
      log('URL: ' + validatedURL);
    });

    mainWindow.on('ready-to-show', () => {
      log('Window ready-to-show event');
      mainWindow.show();
    });

    mainWindow.on('closed', () => {
      log('Window closed');
      mainWindow = null;
    });

    // แสดง window หลัง 5 วินาที ถ้ายังไม่แสดง
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        log('Force showing window after timeout');
        mainWindow.show();
      }
    }, 5000);

    log('Window setup complete');
  } catch (error) {
    log('ERROR creating window: ' + error.message);
    log('Stack: ' + error.stack);
  }
}

app.whenReady().then(() => {
  log('=== App Ready Event ===');
  
  // List files
  try {
    log('Listing __dirname contents:');
    const files = fs.readdirSync(__dirname);
    files.forEach(file => {
      const stats = fs.statSync(path.join(__dirname, file));
      log('  ' + (stats.isDirectory() ? '[DIR] ' : '[FILE]') + file);
    });
  } catch (e) {
    log('Cannot list directory: ' + e.message);
  }
  
  startServer();
  
  // รอให้ server พร้อม
  log('Waiting 3 seconds for server...');
  setTimeout(() => {
    log('Creating window now...');
    createWindow();
  }, 3000);
});

app.on('window-all-closed', () => {
  log('All windows closed event');
  if (serverProcess) {
    log('Killing server process');
    serverProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  log('App activate event');
  if (mainWindow === null) {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  log('UNCAUGHT EXCEPTION: ' + error.message);
  log('Stack: ' + error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log('UNHANDLED REJECTION: ' + reason);
});

log('Main script loaded successfully');