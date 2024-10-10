<template lang="pug">
    form.login-box(name="login-form")
        .mb-3
            label(for="username") Username: 
            input#username(type="text", v-model="input.username")
        .mb-3
            label(for="password") Password: 
            input#password(type="password", v-model="input.password")
        button.btn.btn-outline-dark(type="submit", v-on:click.prevent = "login()") Login

        p Username is: {{input.username}}
        p Password is: {{input.password}}
</template>

<style lang="stylus" scoped>
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
export default {
  name: "LoginView",
  data() {
    return {
      input: {
        username: "",
        password: "",
      },
    };
  },
};
</script>
