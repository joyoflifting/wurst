import { app, BrowserWindow, ipcMain, type WebContents } from "electron";
import { join } from "node:path";
import { createHostRuntime } from "./host-runtime";
import { registerHostIpc, type HostIpc, type IpcSender } from "./host-ipc";
import { isAppNavigation } from "./navigation";
import { createMainWindowOptions } from "./window-options";

const runtime = createHostRuntime();
registerHostIpc(createElectronIpc(), runtime);

function createElectronIpc(): HostIpc {
  return {
    handle(channel, listener) {
      ipcMain.handle(channel, (event, ...args) => listener({ sender: adaptSender(event.sender) }, ...args));
    },
    on(channel, listener) {
      ipcMain.on(channel, (event, ...args) => listener({ sender: adaptSender(event.sender) }, ...args));
    },
  };
}

function adaptSender(contents: WebContents): IpcSender {
  return {
    id: contents.id,
    isDestroyed: () => contents.isDestroyed(),
    send: (channel, payload) => {
      contents.send(channel, payload);
    },
    onDestroyed: (listener) => {
      contents.once("destroyed", listener);
    },
  };
}

function devServerUrl(): string | undefined {
  if (app.isPackaged) {
    return undefined;
  }
  return process.env["ELECTRON_RENDERER_URL"];
}

function createWindow(): void {
  const preloadPath = join(__dirname, "../preload/index.js");
  const window = new BrowserWindow(createMainWindowOptions(preloadPath));
  const serverUrl = devServerUrl();

  window.on("ready-to-show", () => {
    window.show();
  });

  const guardNavigation = (event: { preventDefault: () => void }, url: string): void => {
    if (!isAppNavigation(url, serverUrl)) {
      event.preventDefault();
    }
  };
  window.webContents.on("will-navigate", guardNavigation);
  window.webContents.on("will-redirect", guardNavigation);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  window.webContents.on("did-finish-load", () => {
    console.log("renderer document loaded");
  });
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, url) => {
    console.error(`renderer failed to load (${errorCode} ${errorDescription}) ${url}`);
  });

  if (serverUrl) {
    void window.loadURL(serverUrl);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function stopHost(): void {
  runtime.stop();
}

app.whenReady().then(() => {
  console.log("💪 LFG");
  createWindow();
});

app.on("window-all-closed", () => {
  stopHost();
  app.quit();
});

app.on("before-quit", () => {
  stopHost();
});
