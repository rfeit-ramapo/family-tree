/** This component contains the content for the home page of the application.
This is shown to a logged-out user only and prompts them to find a tree link or
sign in. */

<template lang="pug">
    UpperBanner
    .home-page
      .big-logo
        img(src="@/assets/logo.png" alt="Family Roots logo")
      .info-text
        h1 Welcome to Family Roots!
        p Log in at the top or get a link to view a tree!
</template>

<script lang="ts">
import UpperBanner from "./UpperBanner.vue";
export default {
  name: "HomePage",
  components: {
    UpperBanner,
  },
};
</script>

<style lang="stylus" scoped>
.home-page
  display flex
  flex-direction column
  justify-content center
  align-items center
  height 100vh
  text-align center
  position relative

.big-logo
  position relative
  z-index 1

.big-logo img
  position absolute
  top 50%
  left 50%
  transform translate(-50%, -50%)
  opacity 0.1
  filter blur(1px)
  z-index -1

h1
  position relative
  text-shadow 2px 2px 4px rgba(0, 0, 0, 0.3)
  color green
  z-index 2
  margin-top -300px
</style>
