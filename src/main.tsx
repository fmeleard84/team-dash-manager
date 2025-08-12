import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initKeycloak } from "@/lib/keycloak";

async function bootstrap() {
  console.log("[Bootstrap] Starting React app...");
  console.log("[Bootstrap] Initializing Keycloak before React...");
  try {
    const ok = await initKeycloak();
    console.log("[Bootstrap] Keycloak initialized:", { authenticated: ok });
  } catch (e) {
    console.warn("[Bootstrap] Keycloak init failed (continuing):", e);
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}
bootstrap();
