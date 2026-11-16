import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import UniBalance from "./UniBalance.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UniBalance />
  </React.StrictMode>,
);
