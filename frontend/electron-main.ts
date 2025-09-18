import { app, BrowserWindow } from "electron";
import { join } from "node:path";

const MEETING_LINK = process.env.MEETING_LINK ?? ""; // or set MEETING_ID + PASSCODE
const BACKEND_WS = process.env.BACKEND_WS ?? "ws://localhost:3000/ingest";
const BACKEND_TOKEN = process.env.BACKEND_TOKEN_URL ?? "http://localhost:3000/token";

async function createWindow() {
  const win = new BrowserWindow({
    width: 800, height: 600, show: false, // hidden window
    webPreferences: { preload: join(__dirname, "renderer.js"), nodeIntegration: false, contextIsolation: false }
  });
  // Pass config via URL params
  const url = `file://${join(__dirname, "index.html")}#${encodeURIComponent(JSON.stringify({
    MEETING_LINK, BACKEND_WS, BACKEND_TOKEN
  }))}`;
  await win.loadURL(url);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
