<template lang="pug">
    .modal-overlay(v-if="isModalVisible" @click.self="hideModal")
      .modal-box
        h3 {{ title }}
        input(
            v-if="isInputVisible" 
            type="text" 
            :placeholder="inputPlaceholder" 
            v-model="inputValue" 
            @keyup.enter="confirmAction" 
            @keyup.escape="hideModal"
            ref="inputField"
        )
        .modal-buttons
          button.modal-buttons(@click="hideModal") Cancel
          button.modal-buttons(@click="confirmAction") Confirm
</template>

<style lang="stylus" scoped>
.modal-overlay
  position fixed
  inset 0
  background-color rgba(0, 0, 0, 0.7)
  display flex
  justify-content center
  align-items center
  z-index 1000

.modal-box
  background-color white
  padding 24px
  border-radius 8px
  box-shadow 0 8px 16px rgba(0, 0, 0, 0.2)
  max-width 400px
  width 90% // Ensure it fits smaller screens
  text-align left // Align content to the left for a cleaner layout
  position relative

  input[type="text"]
    width 100% // Makes the input take up the full width of the modal
    padding 10px // Add some padding for a clean look
    margin-top 16px // Space between the input and any content above
    margin-bottom 16px // Space between the input and any content below
    border 1px solid #ccc
    border-radius 4px
    font-size 1em
    box-sizing border-box // Ensures padding and border are included in width


.modal-buttons
  display flex
  justify-content space-between // Ensure buttons are evenly spaced
  gap 8px // Adds spacing between buttons
  margin-top 10px

button
  padding 10px 16px
  border none
  border-radius 4px
  cursor pointer
  font-size 1em
  font-weight bold
  flex 1 // Make buttons equal in size
  text-align center
  &:nth-child(1)
    background-color #f8d7da
    color #721c24
    transition background-color 0.3s ease
    &:hover
      background-color #f5b5b8
  &:nth-child(2)
    background-color #2e8b57
    color white
    transition background-color 0.3s ease
    &:hover
      background-color #247a48
</style>

<script lang="ts">
import { ref, defineComponent, watch } from "vue";

export default defineComponent({
  name: "InputModal",
  props: {
    title: {
      type: String,
      default: "Modal Title",
    },
    isInputVisible: {
      type: Boolean,
      default: false,
    },
    inputPlaceholder: {
      type: String,
      default: "Enter a value",
    },
    confirmAction: {
      type: Function,
      default: () => {},
    },
    hideModal: {
      type: Function,
      default: () => {},
    },
  },
  setup() {
    const isModalVisible = ref(false);
    const inputValue = ref("");
    const inputField = ref<HTMLInputElement | null>(null);

    // Focus on the input field when the modal is shown
    watch(isModalVisible, (newValue) => {
      if (newValue && inputField.value) {
        inputField.value.focus();
      }
    });
  },
});
</script>
