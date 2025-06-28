import { BrowserRouter } from "react-router-dom";
import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "./AuthContext";
import "./i18n";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <MantineProvider defaultColorScheme="dark" theme={{}}>
    <Notifications />
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </MantineProvider>
);
