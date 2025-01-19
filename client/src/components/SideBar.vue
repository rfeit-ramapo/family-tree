<template lang="pug">
    .sidebar
      .sidebar-item#pan(v-on:click="switchTool(Tool.PAN)" :class="{ selected: selectedTool === Tool.PAN }")
        img(src="@/assets/pan_icon.png" alt="Pan icon")
      .sidebar-item#select(v-on:click="switchTool(Tool.SELECT)" :class="{ selected: selectedTool === Tool.SELECT }")
        img(src="@/assets/select_icon.png" alt="Select icon")
      .sidebar-item#jump-to(v-on:click="switchTool(Tool.JUMP_TO)" :class="{ selected: selectedTool === Tool.JUMP_TO }")
        img(src="@/assets/jump_to_icon.png" alt="Jump to icon")
      .sidebar-item#home(v-on:click="switchTool(Tool.HOME)" :class="{ selected: selectedTool === Tool.HOME }")
        img(src="@/assets/home_icon.png" alt="Home icon")
  </template>

<script lang="ts">
import { defineComponent } from "vue";

export enum Tool {
  PAN = "pan",
  SELECT = "select",
  JUMP_TO = "jump-to",
  HOME = "home",
}

export default defineComponent({
  name: "SideBar",
  props: {
    selectedTool: {
      type: String,
      required: true,
    },
  },
  setup(props, { emit }) {
    // Track the selected tool

    // Function to switch the selected tool
    const switchTool = (tool: Tool) => {
      emit("toolChange", tool); // Emit an event to notify the parent component
    };

    return {
      Tool,
      switchTool,
    };
  },
});
</script>

<style lang="stylus">
.sidebar
  display inline-flex
  flex-direction column
  justify-content center  /* Centers items vertically */
  align-items center
  padding 10px
  background-color #f0f0f0
  border 3px solid #ccc
  box-shadow 0 0 10px rgba(0, 0, 0, 0.1)
  position fixed
  top 50%  /* Center the sidebar vertically */
  left 20px
  z-index 1000
  transform translateY(-50%)  /* Adjust to perfectly center it */
  width auto
  height auto

.sidebar-item
  width 100%
  height 50px
  background-color #f0f0f0
  margin-bottom 20px  /* Increase the spacing between items */
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
