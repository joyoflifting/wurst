import { contextBridge, ipcRenderer } from "electron";
import { exposeWurstBridge } from "./expose-bridge";

exposeWurstBridge({
  contextIsolated: process.contextIsolated,
  bridge: contextBridge,
  ipc: ipcRenderer,
});
