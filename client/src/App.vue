// client/src/App.vue

<script setup lang="ts">
import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
});

import "bootstrap/dist/css/bootstrap.min.css";
import LoginView from "./components/LoginView.vue";
</script>

<template lang="pug">
  router-view
</template>

<style lang="stylus"></style>
