<template lang="pug">
    UpperBanner
    .tree-grid
      .tree-card(v-for="tree in trees" :key="tree.id")
        h3.tree-name {{ tree.name }}
        p Last modified: {{ tree.lastModified }}
        // Additional tree information can go here
  </template>

<style lang="stylus" scoped>
.tree-grid
  display grid
  grid-template-columns repeat(auto-fill, 275px) // Allows for responsive columns
  gap 16px // Ensures constant spacing between panels
  padding 16px
  width calc(100% - 32px) // Accounts for padding to fill the container
  box-sizing border-box // Helps manage padding and width interactions
  margin-top 100px // Push panels down below UpperBanner
  position relative // Helps maintain consistent layout

.tree-card
  .tree-name
    white-space nowrap // Prevent line breaks
    overflow hidden // Hide overflow text
    text-overflow ellipsis // Add ellipsis for overflow text
    font-size 2em
  background-color #f3f3f3
  padding 16px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  transition all 0.3s ease
  display flex
  flex-direction column
  align-items flex-start
  width 275px // Fixed width for each card
  height auto
  min-height 120px
  &:hover
    box-shadow 0 6px 12px rgba(0, 0, 0, 0.15)
    transform scale(1.02)

:global(UpperBanner)
  position relative // Ensure it stacks normally
  z-index 1 // Ensure it is above the grid

// Override styles for the body and app within this component
:global(body)
  display block // Change back to block
  margin 0 // Remove any margin

:global(#app)
  display block // Keep as block for consistent vertical flow
  margin 0 auto // Center the app horizontally within the body
  padding 0 2rem // Maintain the padding as desired /
</style>

<script lang="ts">
import UpperBanner from "./UpperBanner.vue";
import { defineComponent, ref, onMounted, type Ref } from "vue";

interface Tree {
  id: number;
  name: string;
  lastModified: string;
}

export default defineComponent({
  name: "TreesView",
  components: {
    UpperBanner,
  },
  setup() {
    const trees: Ref<Tree[]> = ref([]);

    onMounted(async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/trees", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch trees");

        trees.value = await response.json();
      } catch (error) {
        console.error("Error fetching trees:", error);
        // Provide dummy data as fallback
        trees.value = [
          { id: 1, name: "Oak Tree", lastModified: "2023-10-12" },
          { id: 2, name: "Pine Tree", lastModified: "2023-10-15" },
          { id: 3, name: "Maple Tree", lastModified: "2023-10-20" },
        ];
      }
    });

    return {
      trees,
    };
  },
});
</script>
