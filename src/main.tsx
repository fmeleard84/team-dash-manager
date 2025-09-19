import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config"; // Initialize i18n

// Désactiver React.StrictMode temporairement pour éviter les problèmes de double montage
// qui causent des problèmes avec les WebSockets
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
