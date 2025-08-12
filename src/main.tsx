import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initKeycloakWithStoredTokens, keycloak } from "@/lib/keycloak";

async function bootstrap() {
  console.log("[Bootstrap] KC passive init with stored tokens…");
  await initKeycloakWithStoredTokens();
  console.log("[Bootstrap] authenticated =", !!keycloak.authenticated);
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}
bootstrap();
