import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initKeycloakPassive } from "@/lib/keycloak";

async function bootstrap() {
  console.log("[Bootstrap] passive KC init…");
  await initKeycloakPassive();   // ne fait rien de bloquant
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}
bootstrap();
