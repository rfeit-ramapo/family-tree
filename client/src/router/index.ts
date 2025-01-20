/**
 * File to set up the router for the application.
 */

import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../components/HomePage.vue";
import TreesView from "@/components/TreesView.vue";
import TreeView from "@/components/TreeView.vue";

const routes = [
  {
    path: "/",
    name: "HomePage",
    component: HomePage,
  },
  {
    path: "/trees",
    name: "Trees",
    component: TreesView,
    meta: { requiresAuth: true },
  },
  {
    path: "/:treeId",
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
  const isLoggedIn = localStorage.getItem("user");

  if (to.matched.some((record) => record.meta.requiresAuth) && !isLoggedIn) {
    next({ name: "HomePage" });
  } else {
    next();
  }
});

export default router;
