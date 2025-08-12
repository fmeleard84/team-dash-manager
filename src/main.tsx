// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initKeycloakWithStoredTokens, keycloak } from "@/lib/keycloak";

async function bootstrap() {
  const isCallback = window.location.pathname.startsWith("/auth/callback");

  if (!isCallback) {
    console.log("[Bootstrap] KC passive init with stored tokens…");
    await initKeycloakWithStoredTokens();
    console.log("[Bootstrap] authenticated =", !!keycloak.authenticated);
  } else {
    console.log("[Bootstrap] skip KC init on /auth/callback");
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}
bootstrap();
