// client/src/App.vue

<script setup lang="ts">
/* PREVIOUS SCRIPT
import { ref } from "vue";

// Global constant containing the API base URL -> /api
const baseURL = __API_PATH__;

// Reactive variables for managing loading state and response message
const isLoading = ref(false);
const message = ref("");

// Function to fetch data from the server
async function fetchAPI() {
  try {
    // Set loading state to true
    isLoading.value = true;

    // Send a GET request to the server
    const response = await fetch(baseURL);

    // Parse the JSON response
    const data = await response.json();

    // Update the message with the response data
    message.value = data.message;
  } catch (error) {
    // Handle errors
    message.value = "Error fetching data";
    console.error(error);
  } finally {
    // Reset loading state
    isLoading.value = false;
  }
}
*/

// CURRENT SCRIPT
import "bootstrap/dist/css/bootstrap.min.css";
import LoginView from "./components/LoginView.vue";
</script>

<template lang="pug">
  <!-- Button to trigger the fetchAPI function -->
  <!-- <button @click="fetchAPI">Fetch</button> -->

  <!-- Display loading message while fetching data -->
  <!-- <p v-if="isLoading">Loading...</p> -->

  <!-- Display the response message if available -->
  <!-- <p v-else-if="message">{{ message }}</p> -->
  .img-box
    img(alt="Vue logo" src="./assets/logo.svg")
  br
  LoginView
</template>

<style lang="stylus">
.img-box
  margin-top 50px
</style>
