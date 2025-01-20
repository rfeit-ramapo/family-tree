/** Displays the sign-in or sign-out button based on the user's authentication
status. If the user is logged in, their profile picture and email are displayed
along with a sign-out option. Also handles the Google sign-in functionality and
user authentication state. */

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
    // The router for redirecting the user
    const router = useRouter();
    // Google client ID for Google Sign-In
    const clientId =
      "473858816410-pj8vv0rtsfulp3mf52ps628352ah1pb7.apps.googleusercontent.com";

    // Reactive variables

    // Whether the user is logged in
    const isLoggedIn = ref(false);
    // User information (email and profile picture)
    const user = reactive({ email: "", picture: "" });
    // Whether the dropdown menu is open
    const isDropdownOpen = ref(false);

    /*
    NAME
      loadGoogleSignInScript - loads the Google Sign-In script to the page
    
    SYNOPSIS
      () => void

    DESCRIPTION
      This function dynamically creates a script element and appends it to the
      head of the document to load the Google Sign-In script.

    RETURNS
      void
    */
    const loadGoogleSignInScript = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    /*
    NAME
      handleCredentialResponse - 

    SYNOPSIS
      (response: any) => Promise<void>
        response --> the response object from Google Sign-In

    DESCRIPTION
      This function handles the response from Google Sign-In and processes the
      user's credentials. It sends the token to the server for verification and
      logs the user in if successful.

    RETURNS
      A Promise<void> that resolves when the login is processed.
    */
    const handleCredentialResponse = async (response: any) => {
      // Extract the token from the response
      const token = response.credential;

      try {
        // Send the token to the server for verification
        const res = await axiosInstance.post("/google-login", { token });
        user.email = res.data.email;
        user.picture = res.data.picture;
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
    // Expose the handleCredentialResponse function globally for Google Sign-In
    (window as any).handleCredentialResponse = handleCredentialResponse;

    // Toggle the dropdown menu between open and closed
    const toggleDropdown = () => {
      isDropdownOpen.value = !isDropdownOpen.value;
    };

    /*
    NAME
      handleSignOut - handles the sign-out process

    SYNOPSIS
      () => void

    DESCRIPTION
      This function clears the user information and logs the user out. It also
      redirects the user to the home page.

    RETURNS
      void
    */
    const handleSignOut = () => {
      isLoggedIn.value = false;
      user.email = "";
      user.picture = "";

      // Clear user information from local storage
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("userId");

      // Redirect to home page
      router.push({ name: "HomePage" });
    };
    /* handleSignOut */

    /*
    NAME
      handleClickOutside - handles clicks outside the dropdown menu

    SYNOPSIS
      (event: MouseEvent) => void
        event --> the mouse event that triggered the function

    DESCRIPTION
      This function checks if a click event occurred outside the dropdown menu
      and closes the dropdown if it did.

    RETURNS
      void
    */
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
    /* handleClickOutside */

    // On mount, load the script, add event listeners, and retrieve user data
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

    // On unmount, remove the event listener
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
  padding 0
  position relative
  transition background-color 0.3s, box-shadow 0.2s

.login-data
  display flex
  align-items center
  gap 10px
  padding 12px 15px
  background-color #424242
  border-radius 8px
  transition background-color 0.3s, box-shadow 0.2s
  width 100%

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
  width 100%
  background-color #424242
  color white
  border-radius 5px
  z-index 100
  min-width 150px
  display flex
  flex-direction column
  box-shadow 0 2px 5px rgba(0, 0, 0, 0.2)

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
  background-color #424242
  color #4285f4
  padding 12px 15px
  box-shadow 0 2px 5px rgba(0, 0, 0, 0.3)
  cursor pointer
  transition background-color 0.3s, box-shadow 0.3s
  font-weight bold
  font-size 14px

.google-login-btn
  display flex
  align-items center
  justify-content center

.google-login-btn:hover
  background-color #f1f1f1
  box-shadow 0 4px 10px rgba(0, 0, 0, 0.4)

.google-login-btn img
  width 20px
  height 20px
  margin-right 8px

.fade-enter-active, .fade-leave-active
  transition opacity 0.3s

.fade-enter-from, .fade-leave-to
  opacity 0
</style>
