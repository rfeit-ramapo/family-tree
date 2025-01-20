/** Main App component that will be rendered on the client side. */

<script setup lang="ts">
import { onMounted } from "vue";

// Load Google Sign-In script
onMounted(() => {
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
});

import "bootstrap/dist/css/bootstrap.min.css";
</script>

<template lang="pug">
  router-view
</template>

<style lang="stylus"></style>
