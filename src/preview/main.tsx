import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createInMemoryApplicationClient } from "@wurst/application";
import { App } from "@wurst/presentation";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing application root");
}

const client = createInMemoryApplicationClient();

createRoot(rootElement).render(
  <StrictMode>
    <App client={client} />
  </StrictMode>,
);
