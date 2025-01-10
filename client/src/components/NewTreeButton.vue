<template lang="pug">
    .new-tree-btn(@click="showPopup = true")
      h1 +
    
    // Popup for entering the tree name
    .popup(v-if="showPopup")
      .popup-content
        h2 Create New Tree
        input(
          v-model="treeName"
          placeholder="Enter tree name"
          maxlength="128"
        )
        .buttons
          button(@click="submitTree") Submit
          button(@click="cancelPopup") Cancel
      .popup-overlay(@click="cancelPopup") // Overlay to close the popup on click
  </template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import axiosInstance from "../axiosInstance";

export default defineComponent({
  name: "NewTreeButton",
  setup() {
    const showPopup = ref(false);
    const treeName = ref("");
    const errorMessage = ref("");

    const submitTree = async () => {
      // Validate tree name length
      if (treeName.value.trim().length < 1 || treeName.value.length > 128) {
        errorMessage.value =
          "Tree name must be between 1 and 128 characters long.";
        return;
      }

      try {
        // Make the POST request to the server
        await axiosInstance.post("/trees", { name: treeName.value });
        console.log(`Tree "${treeName.value}" created successfully!`);
        // Close the popup and reset the input
        cancelPopup();
      } catch (error) {
        errorMessage.value = "Failed to create tree. Please try again.";
        console.error(error);
      }
    };

    const cancelPopup = () => {
      showPopup.value = false;
      treeName.value = "";
      errorMessage.value = "";
    };

    return {
      showPopup,
      treeName,
      errorMessage,
      submitTree,
      cancelPopup,
    };
  },
});
</script>

<style lang="stylus" scoped>
.popup
  position fixed
  top 50%
  left 50%
  transform translate(-50%, -50%)
  background white
  padding 20px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.2)
  z-index 1000

.popup-content
  display flex
  flex-direction column
  align-items center
  gap 10px

input
  width 100%
  padding 8px
  border 1px solid #ccc
  border-radius 4px
  font-size 16px

.buttons
  display flex
  gap 10px
  margin-top 10px

button
  padding 10px 20px
  border none
  border-radius 4px
  background-color #4CAF50
  color white
  cursor pointer
  font-size 14px
  transition all 0.2s ease

button:hover
  background-color #66BB6A
  transform scale(1.05)

button:nth-child(2)
  background-color #f44336 // Red for cancel button
  &:hover
    background-color #e57373

.popup-overlay
  position fixed
  top 0
  left 0
  width 100vw
  height 100vh
  background rgba(0, 0, 0, 0.4)
  z-index 999
</style>
