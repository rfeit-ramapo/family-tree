<template lang="pug">
    .login-box
      .profile-wrapper(v-show="isLoggedIn" @click="toggleDropdown")
        .login-data
          img.user-profile(:src="user.picture" alt="User Profile Picture" referrerPolicy="no-referrer")
          p.logged-in-text {{ user.email }}
  
        .dropdown-menu(v-show="isDropdownOpen")
          ul
            li(@click="handleSignOut") Sign Out
  
      .g_id_signin#g_id_onload(
        v-show="!isLoggedIn" 
        :data-client_id="clientId"
        data-callback="handleCredentialResponse"
        data-theme="filled_black"
      )
        // Wrap the Google sign-in button and text in a div
        .google-login-container
          img.google-logo(src="../assets/google_logo.svg" alt="Google Logo")
          span Sign in with Google
  </template>

<script lang="ts">
import {
  defineComponent,
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useRouter } from "vue-router"; // Import useRouter
import axiosInstance from "../axiosInstance";

export default defineComponent({
  name: "SignInButton",
  setup() {
    const router = useRouter(); // Get the router instance
    const isLoggedIn = ref(false);
    const user = reactive({ email: "", picture: "" });
    const isDropdownOpen = ref(false);

    const clientId =
      "473858816410-pj8vv0rtsfulp3mf52ps628352ah1pb7.apps.googleusercontent.com";

    const loadGoogleSignInScript = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    const handleCredentialResponse = async (response: any) => {
      const token = response.credential;
      try {
        const res = await axiosInstance.post("/google-login", { token });
        user.email = res.data.email;
        user.picture = res.data.picture;
        console.log(JSON.stringify(res.data));
        isLoggedIn.value = true;

        // Save user information in local storage
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userId", res.data.userId);
        localStorage.setItem("token", token);

        // Redirect to the user's trees view
        router.push({ name: "Trees" });
      } catch (error) {
        console.error("Login failed", error);
      }
    };

    const toggleDropdown = () => {
      isDropdownOpen.value = !isDropdownOpen.value;
    };

    const handleSignOut = () => {
      isLoggedIn.value = false;
      user.email = "";
      user.picture = "";

      // Clear user information from local storage
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      console.log("User signed out");

      // Redirect to home page
      router.push({ name: "HomePage" });
    };

    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector(".dropdown-menu");
      const profileWrapper = document.querySelector(".profile-wrapper");

      if (
        dropdown &&
        !dropdown.contains(event.target as Node) &&
        profileWrapper &&
        !profileWrapper.contains(event.target as Node)
      ) {
        isDropdownOpen.value = false;
      }
    };

    window.handleCredentialResponse = handleCredentialResponse;

    onMounted(() => {
      loadGoogleSignInScript();
      document.addEventListener("click", handleClickOutside);

      // Retrieve user information from local storage
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        Object.assign(user, JSON.parse(storedUser)); // Populate user data from local storage
        isLoggedIn.value = true; // Set the logged-in state to true
      }
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleClickOutside);
    });

    return {
      clientId,
      isLoggedIn,
      user,
      isDropdownOpen,
      toggleDropdown,
      handleSignOut,
    };
  },
});
</script>

<style lang="stylus" scoped>
.login-box
  display flex
  align-items flex-start
  gap 10px

.profile-wrapper
  display flex
  align-items center
  gap 10px
  cursor pointer
  padding 0 // Reset padding to avoid extra space from .login-data
  position relative // Ensures the dropdown is positioned relative to this wrapper
  transition background-color 0.3s, box-shadow 0.2s

.login-data
  display flex
  align-items center
  gap 10px
  padding 12px 15px
  background-color #424242
  border-radius 8px
  transition background-color 0.3s, box-shadow 0.2s
  width 100% // Ensures it takes the full width of the profile wrapper

.login-data:hover
  background-color #616161
  box-shadow 0 4px 10px rgba(0, 0, 0, 0.2)

.user-profile
  width 42px
  height 42px
  border-radius 50%
  object-fit cover

.logged-in-text
  color white
  margin 0
  font-weight bold

.dropdown-menu
  position absolute
  top 65px
  left 0
  width 100% // Matches the profile wrapper's width
  background-color #424242
  color white
  border-radius 5px
  z-index 100
  min-width 150px
  display flex
  flex-direction column
  box-shadow 0 2px 5px rgba(0, 0, 0, 0.2) // Added shadow for aesthetics

ul
  list-style-type none
  margin 0
  padding 10px 0

li
  padding 10px 15px
  cursor pointer
  transition background-color 0.2s

li:hover
  background-color #616161

.g_id_signin
  display flex
  align-items center
  justify-content center
  background-color #424242 // Change background to white
  color #4285f4 // Set the text color to Google's brand color
  padding 12px 15px
  box-shadow 0 2px 5px rgba(0, 0, 0, 0.3)
  cursor pointer
  transition background-color 0.3s, box-shadow 0.3s
  font-weight bold
  font-size 14px

.google-login-btn
  display flex // Ensure items are centered in the button
  align-items center
  justify-content center

.google-login-btn:hover
  background-color #f1f1f1 // Subtle hover effect
  box-shadow 0 4px 10px rgba(0, 0, 0, 0.4)

.google-login-btn img
  width 20px // Adjusted for better proportions
  height 20px
  margin-right 8px // Less space between the logo and text

// Fade transition for dropdown
.fade-enter-active, .fade-leave-active
  transition opacity 0.3s

.fade-enter-from, .fade-leave-to
  opacity 0
</style>
