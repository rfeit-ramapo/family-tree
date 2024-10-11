<template lang="pug">
    .img-box
        img(alt="Vue logo" src="../assets/logo.svg")
    br
    form.login-box(@submit.prevent="handleLogin")
      .mb-3
        label(for="username") Username: 
        input#username(type="text" v-model="input.username" required)
      .mb-3
        label(for="password") Password: 
        input#password(type="password" v-model="input.password" required)
      button.btn.btn-outline-dark(type="submit") Login
  
      p Username is: {{input.username}}
      p Password is: {{input.password}}
</template>

<style lang="stylus" scoped>
.img-box
    margin-top 50px
/* Center the form on the screen */
.login-box
  width 350px
  padding 20px
  border 1px solid #ccc
  border-radius 10px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  background-color #f9f9f9
  margin 50px auto
  text-align left

/* Style for each form input */
.login-box input
  display block
  width 100%
  padding 10px
  margin-bottom 10px
  border-radius 5px
  border 1px solid #ccc

/* Style for the submit button */
.login-box button
  width 100%
  padding 10px
  background-color #333
  color white
  border none
  border-radius 5px
  cursor pointer

/* Add hover effect to the button */
.login-box button:hover
  background-color #555
</style>

<script lang="ts">
import { ref } from "vue";
import axios from "axios";
import axiosInstance from "@/axiosInstance";

export default {
  name: "LoginView",
  setup() {
    // Define the input state using ref for reactivity
    const input = ref({
      username: "",
      password: "",
    });

    const handleLogin = async () => {
      // Send login request to backend
      try {
        const response = await axiosInstance.post("/api/login", {
          username: input.value.username, // Access username from input
          password: input.value.password, // Access password from input
        });
        console.log("Login successful:", response.data);
        // Handle successful login response (e.g., store user info, redirect)
      } catch (error) {
        // Check if the error is an AxiosError
        if (axios.isAxiosError(error)) {
          console.error("Login failed:", error.response?.data || error.message);
          // Handle error response (e.g., display error message)
        } else {
          // Handle unexpected errors
          console.error("Unexpected error:", error);
        }
      }
    };

    return {
      input, // Expose input to the template
      handleLogin,
    };
  },
};
</script>
