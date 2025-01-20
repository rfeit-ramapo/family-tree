/** Displays a green strip at the top of the page with a sign-in button on the
right. */

<template lang="pug">
  .upper-banner
    .banner-button
      SignInButton
  .page-content
</template>

<script lang="ts">
import SignInButton from "./SignInButton.vue";

export default {
  name: "UpperBanner",
  components: {
    SignInButton,
  },
};
</script>

<style lang="stylus" scoped>
.upper-banner
  background-color #2e8b57
  color white
  display flex
  align-items center
  justify-content space-between
  height 80px
  padding 0 20px
  position fixed
  top 0
  left 0
  width 100%
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  z-index 1000

.banner-button
  color #333
  border none
  border-radius 5px
  padding 5px 10px
  position fixed
  right 0

.page-content
  margin-top 80px
</style>
