import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initKeycloak, keycloak } from "@/lib/keycloak";

async function bootstrap() {
  console.log("[Bootstrap] Starting React app...");
  console.log("[Bootstrap] Initializing Keycloak before React...");
  try {
    await initKeycloak();
    console.log("[Bootstrap] keycloak.authenticated =", !!keycloak.authenticated);
  } catch (e) {
    console.warn("[Bootstrap] Keycloak init failed (continuing):", e);
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}
bootstrap();
