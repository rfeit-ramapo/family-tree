// Main entry point for the app

import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

createApp(App)
  .use(router) // Use the router
  .mount("#app");
