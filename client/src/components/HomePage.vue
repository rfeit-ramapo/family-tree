<template lang="pug">
    UpperBanner
    .home-page
      .big-logo
        img(src="@/assets/logo.png" alt="Family Roots logo")
      .info-text
        h1 Welcome to Family Roots!
        p Log in at the top or get a link to view a tree!
</template>

<style lang="stylus" scoped>
.home-page
  display flex
  flex-direction column
  justify-content center  /* Keep the logo in the center */
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
  filter blur(1px) /* Apply a slight blur to the logo */
  z-index -1

h1
  position relative
  text-shadow 2px 2px 4px rgba(0, 0, 0, 0.3)
  color green
  z-index 2
  margin-top -300px  /* Move the text closer to the top */
</style>

<script lang="ts">
import UpperBanner from "./UpperBanner.vue";
export default {
  name: "HomePage",
  components: {
    UpperBanner, // Register the component
  },
};
</script>
