/** Handles input for options related to the tree. Displays a modal with an
optional input field that allows values to be entered. The modal can be
confirmed or cancelled, and the events are emitted to the parent component. */

<template lang="pug">
  .modal-overlay(v-if="isModalVisible" @click.self="onCancel")
    .modal-box
      h3 {{ title }}
      input(
        v-if="isInputVisible"
        v-model="inputValue"
        type="text"
        :placeholder="inputPlaceholder"
        @keyup.enter="onConfirm"
        @keyup.escape="onCancel"
        ref="inputField"
      )
      .modal-buttons
        button.modal-buttons(@click="onCancel") Cancel
        button.modal-buttons(@click="onConfirm") Confirm
</template>

<script lang="ts">
import { ref, defineComponent, watch, nextTick } from "vue";

export default defineComponent({
  name: "InputModal",
  props: {
    // Title of the modal
    title: {
      type: String,
      default: "Modal Title",
    },
    // Whether the input field is visible
    isInputVisible: {
      type: Boolean,
      default: false,
    },
    // Whether the modal is visible
    isModalVisible: {
      type: Boolean,
      default: false,
    },
    // Placeholder text for the input field
    inputPlaceholder: {
      type: String,
      default: "Enter a value",
    },
  },

  setup(props, { emit }) {
    // Reactive variables

    // The value of the input field
    const inputValue = ref("");
    // Reference to the input field element
    const inputField = ref<HTMLInputElement | null>(null);

    // Watch for changes to modal visibility
    watch(
      () => props.isModalVisible,
      async (newVal) => {
        if (newVal && props.isInputVisible) {
          // Wait for DOM to update before focusing the input field
          await nextTick();
          inputField.value?.focus();
        }
      },
      // Run immediately on mount
      { immediate: true }
    );

    // Confirm the action and reset the input field
    const onConfirm = () => {
      emit("confirm-action", inputValue.value);
      inputValue.value = "";
    };

    // Cancel the action and reset the input field
    const onCancel = () => {
      inputValue.value = "";
      emit("cancel-action");
    };

    return {
      inputValue,
      inputField,
      onConfirm,
      onCancel,
    };
  },
});
</script>

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
  width 90%
  text-align left
  position relative

  input[type="text"]
    width 100%
    padding 10px
    margin-top 16px
    margin-bottom 16px
    border 1px solid #ccc
    border-radius 4px
    font-size 1em
    box-sizing border-box

.modal-buttons
  display flex
  justify-content space-between
  gap 8px
  margin-top 10px

  button
    padding 10px 16px
    border none
    border-radius 4px
    cursor pointer
    font-size 1em
    font-weight bold
    flex 1
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
