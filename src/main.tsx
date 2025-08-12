import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Simple approach: render React immediately and handle Keycloak in the context
console.log('[Bootstrap] Starting React app...');
createRoot(document.getElementById("root")!).render(<App />);