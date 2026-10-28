import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@wurst/presentation";
import { createElectronApplicationClient } from "./electron-application-client";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing application root");
}

const bridge = window.wurst;
const root = createRoot(rootElement);

if (!bridge) {
  root.render(
    <main>
      <h1>WÜRST</h1>
      <p>The Electron preload bridge is not available.</p>
    </main>,
  );
} else {
  const client = createElectronApplicationClient(bridge);
  root.render(
    <StrictMode>
      <App client={client} />
    </StrictMode>,
  );
}
