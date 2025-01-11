import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../components/HomePage.vue"; // Create this component
import LoginView from "../components/LoginView.vue";
import TreesView from "@/components/TreesView.vue";
import TreeView from "@/components/TreeView.vue";

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
  {
    path: "/trees",
    name: "Trees",
    component: TreesView, // View showing all trees
    meta: { requiresAuth: true },
  },
  {
    path: "/:treeId", // Dynamic route for a single tree
    name: "Tree",
    component: TreeView,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem("user"); // Or use a more reliable auth state if available

  if (to.matched.some((record) => record.meta.requiresAuth) && !isLoggedIn) {
    next({ name: "HomePage" });
  } else {
    next();
  }
});

export default router;
