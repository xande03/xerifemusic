import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore saved theme before first render
const savedTheme = localStorage.getItem('demus-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
}
const savedColor = localStorage.getItem('demus-color') || 'red';
document.documentElement.classList.add(`theme-${savedColor}`);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker and request persistent storage
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then(
        (reg) => console.log("SW registered:", reg.scope),
        (err) => console.log("SW registration failed:", err)
      );
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

// Request persistent storage so browser doesn't evict IndexedDB/cache
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((granted) => {
    if (granted) console.log("Persistent storage granted");
  });
}
