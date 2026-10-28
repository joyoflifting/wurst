export interface SecureWebPreferences {
  preload: string;
  contextIsolation: true;
  nodeIntegration: false;
  nodeIntegrationInWorker: false;
  nodeIntegrationInSubFrames: false;
  sandbox: true;
  webSecurity: true;
}

export function createSecureWebPreferences(preloadPath: string): SecureWebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    sandbox: true,
    webSecurity: true,
  };
}

export function createMainWindowOptions(preloadPath: string) {
  return {
    width: 1100,
    height: 740,
    minWidth: 760,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    title: "WÜRST",
    backgroundColor: "#f4f1ea",
    webPreferences: createSecureWebPreferences(preloadPath),
  };
}
