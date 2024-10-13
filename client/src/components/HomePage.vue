<template lang="pug">
    UpperBanner
    .home-page
      h1 Welcome to the Application
      router-link(to="/login") Login
  </template>

<style lang="stylus" scoped>
.home-page
  display flex
  flex-direction column
  justify-content center
  align-items center
  height 100vh
  text-align center

h1
  margin-bottom 20px

router-link
  text-decoration none
  padding 10px 20px
  background-color #007bff
  color white
  border-radius 5px
  transition background-color 0.3s

router-link:hover
  background-color #0056b3
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
