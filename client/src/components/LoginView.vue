<template lang="pug">
  .img-box
      img(alt="Vue logo" src="../assets/logo.svg")
  br
  .login-box
    .user-info(v-show="isLoggedIn")
      img.user-profile(:src="user.picture" alt="User Profile Picture")
      p Logged in as #[strong {{ user.email }}]

    .google-login-btn
      #g_id_onload(
          :data-client_id="clientId"
          data-callback="handleCredentialResponse"
          data-auto_prompt="false"
        )
      .g_id_signin(
          data-type="standard"
          data-shape="rectangular"
          data-theme="outline"
          data-text="signin_with"
          data-size="large"
          data-logo_alignment="left"
        )
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, reactive } from "vue";
import axiosInstance from "../axiosInstance";

export default defineComponent({
  name: "LoginView",

  setup() {
    const isLoggedIn = ref(false);
    const user = reactive({ email: "", picture: "" });

    const clientId =
      "473858816410-pj8vv0rtsfulp3mf52ps628352ah1pb7.apps.googleusercontent.com";

    // Load the Google Sign-In script dynamically
    const loadGoogleSignInScript = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => {
        console.log("Google Sign-In script loaded");
      };
    };

    // Handle the Google Credential response
    const handleCredentialResponse = async (response: any) => {
      console.log("Google Credential Response", response);
      const token = response.credential;
      try {
        const res = await axiosInstance.post("/google-login", { token });
        user.email = res.data.email;
        user.picture = res.data.picture;
        isLoggedIn.value = true;
        console.log("Login successful", res.data);
      } catch (error) {
        console.error("Login failed", error);
      }
    };

    // Register the global callback function
    window.handleCredentialResponse = handleCredentialResponse;

    // Load the Google script when component is mounted
    onMounted(() => {
      loadGoogleSignInScript();
    });

    return {
      clientId,
      isLoggedIn,
      user,
    };
  },
});

// Extend the global window object for TypeScript
declare global {
  interface Window {
    handleCredentialResponse: (response: any) => void;
  }
}
</script>

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

.user-info
  display flex
  align-items center
  margin-bottom 15px

.user-profile
  width 40px
  height 40px
  border-radius 50%
  margin-right 10px

.google-login-btn
  display flex
  align-items center

p
  margin 0  // Remove any default margin from the paragraph tag to align properly
</style>
