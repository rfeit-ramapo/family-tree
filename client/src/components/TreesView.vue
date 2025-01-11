<template lang="pug">
  UpperBanner
    // If there is an error fetching trees, show an error message
  .error-message(v-if="errorMessage")
    p {{ errorMessage }}
  // If there are no trees, show a message to create a new one
  .no-trees-message(v-if="!errorMessage && trees.length === 0")
    p You do not currently have any trees. Press '+' to create a new tree!

  // Modal for creating a new tree
  InputModal(
    :title="'Create a New Tree'"
    :isInputVisible="true"
    :isModalVisible="isCreateModalVisible"
    :inputPlaceholder="'Enter tree name'"
    @confirm-action="createTree"
    @cancel-action="hideCreateModal"
  )

  // Modal for renaming a tree
  InputModal(
    :title="'Rename Tree'"
    :isInputVisible="true"
    :isModalVisible="isRenameModalVisible"
    :inputPlaceholder="'Enter new name'"
    @confirm-action="renameTree"
    @cancel-action="hideRenameModal"
  )

  // Modal for deleting a tree
  InputModal(
    :title="'Confirm Deletion'"
    :isInputVisible="false"
    :isModalVisible="isDeleteModalVisible"
    @confirm-action="deleteTree"
    @cancel-action="hideDeleteModal"
  )

  .tree-grid
    // Otherwise, display the trees
    .tree-card(v-for="tree in trees" :key="tree.id" @contextmenu.prevent="showContextMenu($event, tree)")
      h3.tree-name {{ tree.name }}
      p Last accessed: {{ formatDate(tree.lastModified) }}
      // Additional tree information can go here

  .tree-context-menu(v-if="contextMenuVisible" :style="contextMenuStyle")
    ul.context-menu-list
      li.context-menu-item(@click="showRenameModal") Rename
      li.context-menu-item(@click="showDeleteModal") Delete

  // Floating '+' button to create a new tree
  button.add-tree-button(@click="showCreateModal") +
</template>

<style lang="stylus" scoped>
.error-message
  background-color #f8d7da
  color #721c24
  padding 16px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  margin-bottom 16px
  text-align center
  margin-top 100px // Push message down below UpperBanner

.no-trees-message
  background-color #f3f3f3
  color #495057
  padding 16px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  margin-bottom 16px
  text-align center
  margin-top 100px // Push message down below UpperBanner

.tree-grid
  display grid
  grid-template-columns repeat(auto-fill, 275px) // Allows for responsive columns
  gap 16px // Ensures constant spacing between panels
  padding 16px
  width calc(100% - 32px) // Accounts for padding to fill the container6
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

.add-tree-button
  position fixed
  bottom 24px
  right 24px
  background-color #2e8b57
  color white
  border none
  border-radius 50%
  width 60px
  height 60px
  font-size 2em
  display flex
  align-items center
  justify-content center
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.2)
  cursor pointer
  transition all 0.3s ease
  &:hover
    transform scale(1.1)
    box-shadow 0 6px 12px rgba(0, 0, 0, 0.3)

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

.tree-context-menu
  position absolute
  background-color white
  border 1px solid #ccc
  border-radius 4px
  box-shadow 0 2px 8px rgba(0, 0, 0, 0.15)
  z-index 1000
  min-width 150px
  padding 4px 0

.context-menu-list
  list-style-type none
  margin 0
  padding 0

.context-menu-item
  padding 8px 16px
  cursor pointer
  font-size 16px
  color #333
  transition background-color 0.2s ease
  &:hover
    background-color #f5f5f5
</style>

<script lang="ts">
import UpperBanner from "./UpperBanner.vue";
import InputModal from "./InputModal.vue";

import {
  defineComponent,
  ref,
  onMounted,
  onBeforeMount,
  type Ref,
  computed,
} from "vue";

interface Tree {
  creator: string;
  name: string;
  id: string;
  dateCreated: Date;
  lastModified: Date;
}

export default defineComponent({
  name: "TreesView",
  components: {
    UpperBanner,
    InputModal,
  },
  setup() {
    const trees: Ref<Tree[]> = ref([]);
    const errorMessage: Ref<string | null> = ref(null);
    const isCreateModalVisible = ref(false);
    const isRenameModalVisible = ref(false);
    const isDeleteModalVisible = ref(false);

    const showCreateModal = () => {
      isCreateModalVisible.value = true;
    };

    const hideCreateModal = () => {
      isCreateModalVisible.value = false;
    };

    const showRenameModal = () => {
      console.log("Showing rename modal");
      contextMenuVisible.value = false;
      isRenameModalVisible.value = true;
    };

    const hideRenameModal = () => {
      isRenameModalVisible.value = false;
    };

    const showDeleteModal = () => {
      console.log("Showing delete modal");
      contextMenuVisible.value = false;
      isDeleteModalVisible.value = true;
    };

    const hideDeleteModal = () => {
      isDeleteModalVisible.value = false;
    };

    const fetchTrees = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/trees", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch trees");

        trees.value = await response.json();
        console.log(JSON.stringify(trees.value, null, 2));
        errorMessage.value = null; // Clear any previous error
      } catch (error) {
        console.error("Error fetching trees:", error);
        errorMessage.value =
          "There was an error fetching your trees. Please try again later.";
        trees.value = []; // Ensure trees array is empty if there's an error
      }
    };

    const createTree = async (inputValue: string) => {
      console.log("Creating tree with name:", inputValue);
      if (!inputValue.trim()) {
        alert("Tree name cannot be empty. Please enter a valid name.");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/trees/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: inputValue }),
        });

        if (!response.ok) throw new Error("Failed to create tree");

        hideCreateModal(); // Hide the modal
        await fetchTrees(); // Refresh the tree list
      } catch (error) {
        console.error("Error creating tree:", error);
        alert("Failed to create tree. Please try again.");
      }
    };

    // Context menu
    const contextMenuVisible = ref(false);
    const contextMenuPosition = ref({ x: 0, y: 0 });
    const selectedTree = ref<Tree | null>(null);

    // Add computed property for context menu style
    const contextMenuStyle = computed(() => ({
      top: `${contextMenuPosition.value.y}px`,
      left: `${contextMenuPosition.value.x}px`,
    }));

    // Add click event listener to close context menu
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuVisible.value) {
        const contextMenu = document.querySelector(".tree-context-menu");
        if (contextMenu && !contextMenu.contains(event.target as Node)) {
          hideContextMenu();
        }
      }
    };

    const showContextMenu = (event: MouseEvent, tree: Tree) => {
      event.preventDefault();
      event.stopPropagation(); // Prevent the click from being detected as outside

      // Adjust position to prevent menu from going off-screen
      const x = Math.min(event.clientX, window.innerWidth - 150); // 150px is min-width of menu
      const y = Math.min(event.clientY, window.innerHeight - 100); // 100px is approximate menu height

      contextMenuPosition.value = { x, y };
      contextMenuVisible.value = true;
      selectedTree.value = tree;
    };

    const hideContextMenu = () => {
      contextMenuVisible.value = false;
      selectedTree.value = null;
    };

    const renameTree = async (inputValue: string) => {
      console.log("Renaming tree:", inputValue);
      if (!inputValue.trim()) {
        alert("Tree name cannot be empty. Please enter a valid name.");
        return;
      } else if (!selectedTree.value) {
        alert("Error in selecting tree. Please try again.");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/trees/rename", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: inputValue,
            treeId: selectedTree.value.id,
          }),
        });

        if (!response.ok) throw new Error("Failed to rename tree");

        hideRenameModal(); // Hide the modal
        await fetchTrees(); // Refresh the tree list
      } catch (error) {
        console.error("Error renaming tree:", error);
        alert("Failed to rename tree. Please try again.");
      }
    };

    const deleteTree = async () => {
      if (!selectedTree.value) {
        alert("Error in selecting tree. Please try again.");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/trees/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            treeId: selectedTree.value.id,
          }),
        });

        if (!response.ok) throw new Error("Failed to delete tree");

        hideDeleteModal(); // Hide the modal
        await fetchTrees(); // Refresh the tree list
      } catch (error) {
        console.error("Error deleting tree:", error);
        alert("Failed to delete tree. Please try again.");
      }
    };

    // Add event listeners when component is mounted
    onMounted(() => {
      document.addEventListener("click", handleClickOutside);
      fetchTrees();
    });

    // Remove event listeners when component is unmounted
    onBeforeMount(() => {
      document.removeEventListener("click", handleClickOutside);
    });

    return {
      trees,
      errorMessage,
      createTree,
      showContextMenu,
      hideContextMenu,
      contextMenuVisible,
      contextMenuPosition,
      contextMenuStyle,
      selectedTree,
      renameTree,
      showCreateModal,
      hideCreateModal,
      isCreateModalVisible,
      showRenameModal,
      isRenameModalVisible,
      hideRenameModal,
      showDeleteModal,
      isDeleteModalVisible,
      hideDeleteModal,
      deleteTree,
    };
  },

  methods: {
    formatDate(date: string) {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric", // "2025"
        month: "short", // "January"
        day: "numeric", // "10"
      };
      return new Date(date).toLocaleDateString("en-US", options);
    },
  },
});
</script>
