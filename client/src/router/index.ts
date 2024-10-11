import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../components/HomePage.vue"; // Create this component
import LoginView from "../components/LoginView.vue";

const routes = [
  {
    path: "/",
    name: "HomePage",
    component: HomePage, // This will be your homepage
  },
  {
    path: "/login",
    name: "Login",
    component: LoginView, // This is your login page
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
