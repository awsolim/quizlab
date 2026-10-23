import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { readStore, storageKey } from "./core";
import { retireLegacyDemo } from "./legacy-demo";
import "katex/dist/katex.min.css";
import "./style.css";

async function bootstrap() {
  let initialError = "";
  try {
    const saved = readStore(localStorage);
    const cleaned = await retireLegacyDemo(saved);
    if (cleaned !== saved)
      localStorage.setItem(storageKey, JSON.stringify(cleaned));
  } catch {
    initialError =
      "Could not update saved data. Check browser storage permissions and reload.";
  }
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App initialError={initialError} />
    </React.StrictMode>,
  );
}
void bootstrap();
