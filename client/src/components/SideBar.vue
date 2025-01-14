<template lang="pug">
    .sidebar
      .sidebar-item#pan(v-on:click="switchTool(Tool.PAN)" :class="{ selected: selectedTool === Tool.PAN }")
        img(src="@/assets/pan_icon.png" alt="Pan icon")
      .sidebar-item#select(v-on:click="switchTool(Tool.SELECT)" :class="{ selected: selectedTool === Tool.SELECT }")
        img(src="@/assets/select_icon.png" alt="Select icon")
  </template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export enum Tool {
  PAN = "pan",
  SELECT = "select",
}

export default defineComponent({
  name: "SideBar",
  setup(_, { emit }) {
    // Track the selected tool
    const selectedTool = ref<Tool>(Tool.PAN);

    // Function to switch the selected tool
    const switchTool = (tool: Tool) => {
      selectedTool.value = tool; // Update the currently selected tool
      emit("toolChange", tool); // Emit an event to notify the parent component
    };

    return {
      Tool,
      selectedTool,
      switchTool,
    };
  },
});
</script>

<style lang="stylus">
.sidebar
  width 80px
  height 75%
  background-color #f0f0f0
  display flex
  flex-direction column
  justify-content flex-start
  align-items center
  padding 10px
  border 3px solid #ccc
  box-shadow 0 0 10px rgba(0, 0, 0, 0.1)
  position fixed
  top 150px
  left 20px
  z-index 1000

.sidebar-item
  width 100%
  height 50px
  background-color #f0f0f0
  margin-bottom 10px
  display flex
  justify-content center
  align-items center
  cursor pointer
  border 3px solid #ccc

  img
    max-width 90%
    max-height 90%
    object-fit contain

  &:hover
    box-shadow 0 6px 12px rgba(0, 0, 0, 0.15)
    transform scale(1.02)

.selected
  border 3px solid #2e8b57
  background-color #bad6c2
</style>
