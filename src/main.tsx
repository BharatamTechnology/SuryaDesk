import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch((err) => {
        console.log("SW registration failed: ", err);
      });
  });
}

// Global handler to catch chunk load / dynamic import errors and force-reload the app to fetch the latest deployment.
window.addEventListener("error", (e) => {
  const message = e.message || "";
  if (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("chunk-load-failed") ||
    message.includes("Loading chunk")
  ) {
    console.warn("New version detected (chunk error). Reloading application...");
    window.location.reload();
  }
});

window.addEventListener("unhandledrejection", (e) => {
  const message = e.reason?.message || "";
  if (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("chunk-load-failed") ||
    message.includes("Loading chunk")
  ) {
    console.warn("New version detected (import promise rejection). Reloading application...");
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
