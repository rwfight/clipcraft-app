// ClipCraft for Mac: the ClipCraft website in its own window. Everything (pages,
// downloads, ads) comes from the live site, so the app updates whenever it does.

const { app, BrowserWindow, Menu, nativeTheme, Notification, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const SITE = "https://clipcraft-ai-sage.vercel.app";
const SITE_HOST = new URL(SITE).host;

let mainWindow = null;

// Own data folder, so it never collides with other builds named "ClipCraft".
app.setPath("userData", path.join(app.getPath("appData"), "app.clipcraft.mac"));
if (!app.requestSingleInstanceLock()) app.quit();

const isSite = (url) => {
  try {
    return new URL(url).host === SITE_HOST;
  } catch {
    return false;
  }
};

function uniquePath(dir, filename) {
  const { name, ext } = path.parse(filename);
  let candidate = path.join(dir, filename);
  for (let i = 1; fs.existsSync(candidate); i++) candidate = path.join(dir, `${name} (${i})${ext}`);
  return candidate;
}

const offlinePage = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><head><meta charset="utf-8"><title>ClipCraft</title><style>
body{margin:0;height:100vh;display:grid;place-items:center;background:#09090b;color:#e4e4e7;font:15px -apple-system,system-ui,sans-serif;text-align:center}
h1{font-size:20px;color:#fff;margin:0 0 8px}p{color:#a1a1aa;margin:0 0 20px}
button{background:#8b5cf6;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;font-weight:600;cursor:pointer}
</style></head><body><div><h1>You're offline</h1><p>ClipCraft needs an internet connection.</p>
<button onclick="location.href='${SITE}/'">Try again</button></div></body></html>`)}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 420,
    minHeight: 520,
    title: "ClipCraft",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  // CLIPCRAFT_HIDDEN keeps the window off screen for automated tests.
  if (!process.env.CLIPCRAFT_HIDDEN) mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => (mainWindow = null));

  const { webContents } = mainWindow;
  // Lets the site recognise the app (it hides its "Get the Mac app" button).
  webContents.setUserAgent(`${webContents.getUserAgent()} ClipCraftDesktop/${app.getVersion()}`);

  // Anything that leaves the site (ads, video pages, CDN links) opens in the default browser.
  webContents.setWindowOpenHandler(({ url }) => {
    if (isSite(url)) mainWindow.loadURL(url);
    else if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  webContents.on("will-navigate", (e, url) => {
    if (isSite(url) || url.startsWith("data:")) return;
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });

  webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    // -3 is an aborted load (e.g. a redirect), not a connection problem.
    if (isMainFrame && code !== -3 && isSite(url)) mainWindow.loadURL(offlinePage);
  });

  // Saves go straight to ~/Downloads, like a browser, without a dialog.
  webContents.session.on("will-download", (_e, item) => {
    const target = uniquePath(app.getPath("downloads"), item.getFilename() || "download");
    item.setSavePath(target);
    item.once("done", (_ev, state) => {
      if (state !== "completed") return;
      app.dock?.downloadFinished(target);
      if (Notification.isSupported()) {
        const note = new Notification({ title: "Saved to Downloads", body: path.basename(target), silent: true });
        note.on("click", () => shell.showItemInFolder(target));
        note.show();
      }
    });
  });

  mainWindow.loadURL(SITE);
}

function buildMenu() {
  const go = (p) => mainWindow?.loadURL(SITE + p);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      { role: "editMenu" },
      {
        label: "Go",
        submenu: [
          { label: "Video Downloader", accelerator: "Cmd+1", click: () => go("/") },
          { label: "All Converters", accelerator: "Cmd+2", click: () => go("/converters") },
          { type: "separator" },
          { label: "Back", accelerator: "Cmd+[", click: () => mainWindow?.webContents.navigationHistory.goBack() },
          { label: "Forward", accelerator: "Cmd+]", click: () => mainWindow?.webContents.navigationHistory.goForward() },
          { type: "separator" },
          { label: "Open Downloads Folder", accelerator: "Cmd+Shift+D", click: () => shell.openPath(app.getPath("downloads")) },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      { role: "windowMenu" },
    ]),
  );
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on("window-all-closed", () => app.quit());

app.whenReady().then(() => {
  if (process.env.CLIPCRAFT_HIDDEN) app.dock?.hide();
  nativeTheme.themeSource = "dark";
  buildMenu();
  createWindow();
});
