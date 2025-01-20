/** Displays a user's owned trees and allows them to create, rename, and delete
trees. */

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
    .tree-card(v-for="tree in trees" :key="tree.id" @contextmenu.prevent="showContextMenu($event, tree)" @click="viewTree(tree.id)")
      h3.tree-name {{ tree.name }}
      p Date created: {{ formatDate(tree.dateCreated) }}

  ContextMenu(
    :contextMenuType="ContextMenuType.TREE"
    :contextMenuVisible="contextMenuVisible"
    :contextMenuPosition="contextMenuPosition"
    :isPublic="selectedTree?.isPublic"
    @rename="showRenameModal"
    @toggle-public="togglePublic"
    @delete="showDeleteModal"
  )

  // Floating '+' button to create a new tree
  button.add-tree-button(@click="showCreateModal") +
</template>

<script lang="ts">
import UpperBanner from "./UpperBanner.vue";
import InputModal from "./InputModal.vue";
import { defineComponent, ref, onMounted, onBeforeMount, type Ref } from "vue";
import router from "@/router";
import { ContextMenuType } from "@/helpers/sharedTypes";
import ContextMenu from "./ContextMenu.vue";

/*
Interface for metadata associated with a tree.
*/
interface Tree {
  // The user id of who created the tree
  creator: string;
  // The name of the tree
  name: string;
  // The unique id of the tree
  id: string;
  // The timestamp of when the tree was created
  dateCreated: Date;
}

export default defineComponent({
  name: "TreesView",
  components: {
    UpperBanner,
    InputModal,
    ContextMenu,
  },

  setup() {
    // Reactive variables

    // List of trees owned by the user
    const trees: Ref<Tree[]> = ref([]);
    // Error message to display if fetching trees fails
    const errorMessage: Ref<string | null> = ref(null);
    // Visibility of create, rename, and delete modals
    const isCreateModalVisible = ref(false);
    const isRenameModalVisible = ref(false);
    const isDeleteModalVisible = ref(false);

    // Context menu state
    const contextMenuVisible = ref(false);
    const contextMenuPosition = ref({ x: 0, y: 0 });
    // The currently selected tree for context menu actions
    const selectedTree = ref<Tree | null>(null);

    // Show and hide modals
    const showCreateModal = () => {
      isCreateModalVisible.value = true;
    };
    const hideCreateModal = () => {
      isCreateModalVisible.value = false;
    };
    const showRenameModal = () => {
      contextMenuVisible.value = false;
      isRenameModalVisible.value = true;
    };
    const hideRenameModal = () => {
      isRenameModalVisible.value = false;
    };
    const showDeleteModal = () => {
      contextMenuVisible.value = false;
      isDeleteModalVisible.value = true;
    };
    const hideDeleteModal = () => {
      isDeleteModalVisible.value = false;
    };

    /*
    NAME
      fetchTrees - Fetches the list of trees from the server
    
    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function fetches the list of trees owned by the user from the server.
      If the fetch is successful, the list of trees is stored in the 'trees' variable.
      If the fetch fails, an error message is stored in the 'errorMessage' variable.

    RETURNS
      A Promise that resolves when the trees have been fetched
    */
    const fetchTrees = async () => {
      try {
        // Fetch trees from the server
        const token = localStorage.getItem("token");
        const response = await fetch("/api/trees", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch trees");

        // Set the list of trees and clear any previous error message
        trees.value = await response.json();
        errorMessage.value = null;
      } catch (error) {
        console.error("Error fetching trees:", error);
        errorMessage.value =
          "There was an error fetching your trees. Please try again later.";
        trees.value = [];
      }
    };
    /* fetchTrees */

    /*
    NAME
      createTree - Creates a new tree with the given name

    SYNOPSIS
      (inputValue: string) => Promise<void>
        inputValue --> the name of the tree to create

    DESCRIPTION
      This function creates a new tree with the given name. If the tree name is empty,
      an alert is shown to the user. If the tree creation fails, an alert is shown to the user.

    RETURNS
      A Promise that resolves when the tree has been created
    */
    const createTree = async (inputValue: string) => {
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

        hideCreateModal();
        await fetchTrees();
      } catch (error) {
        console.error("Error creating tree:", error);
        alert("Failed to create tree. Please try again.");
      }
    };

    // Add click event listener to close context menu
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuVisible.value) {
        const contextMenu = document.querySelector(".tree-context-menu");
        if (contextMenu && !contextMenu.contains(event.target as Node)) {
          hideContextMenu();
        }
      }
    };

    // Show the context menu at the mouse click position for the given tree
    const showContextMenu = (event: MouseEvent, tree: Tree) => {
      event.preventDefault();
      event.stopPropagation();

      // Adjust position to prevent menu from going off-screen
      const x = Math.min(event.clientX, window.innerWidth - 150); // 150px is min-width of menu
      const y = Math.min(event.clientY, window.innerHeight - 100); // 100px is approximate menu height

      contextMenuPosition.value = { x, y };
      contextMenuVisible.value = true;
      selectedTree.value = tree;
    };

    // Hide the context menu
    const hideContextMenu = () => {
      contextMenuVisible.value = false;
      selectedTree.value = null;
    };

    /*
    NAME
      renameTree - Renames the selected tree with the given name

    SYNOPSIS
      (inputValue: string) => Promise<void>
        inputValue --> the new name for the tree

    DESCRIPTION
      This function renames the selected tree with the given name. If the tree name is empty,
      an alert is shown to the user. If the tree renaming fails, an alert is shown to the user.

    RETURNS
      A Promise that resolves when the tree has been renamed
    */
    const renameTree = async (inputValue: string) => {
      if (!inputValue.trim()) {
        alert("Tree name cannot be empty. Please enter a valid name.");
        return;
      } else if (!selectedTree.value) {
        alert("Error in selecting tree. Please try again.");
        return;
      }

      // Attempt to rename the tree
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

        hideRenameModal();
        await fetchTrees();
      } catch (error) {
        console.error("Error renaming tree:", error);
        alert("Failed to rename tree. Please try again.");
      }
    };
    /* renameTree */

    /*
    NAME
      deleteTree - Deletes the selected tree
    
    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function deletes the selected tree. If the tree deletion fails, an alert is shown to the user.

    RETURNS
      A Promise that resolves when the tree has been deleted
    */
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

        hideDeleteModal();
        await fetchTrees();
      } catch (error) {
        console.error("Error deleting tree:", error);
        alert("Failed to delete tree. Please try again.");
      }
    };
    /* deleteTree */

    // View the tree with the given id
    const viewTree = (treeId: string) => {
      // Redirect to the tree view page
      router.push(`/${treeId}`);
    };

    /*
    NAME
      togglePublic - Toggles the privacy of the selected tree

    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function toggles the privacy of the selected tree. If the tree privacy toggling fails,
      an alert is shown to the user.

    RETURNS
      A Promise that resolves when the tree privacy has been toggled
    */
    const togglePublic = async () => {
      if (!selectedTree.value) {
        alert("Error in selecting tree. Please try again.");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/tree/toggle-public/${selectedTree.value.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to toggle tree privacy");

        await fetchTrees();
      } catch (error) {
        console.error("Error toggling tree privacy:", error);
        alert("Failed to toggle tree privacy. Please try again.");
      }
      hideContextMenu();
    };
    /* togglePublic */

    // Format the date in a user-friendly way
    const formatDate = (date: string) => {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      return new Date(date).toLocaleDateString("en-US", options);
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
      viewTree,
      ContextMenuType,
      togglePublic,
      formatDate,
    };
  },
});
</script>

<style lang="stylus" scoped>
.error-message
  background-color #f8d7da
  color #721c24
  padding 16px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  margin-bottom 16px
  text-align center

.no-trees-message
  background-color #f3f3f3
  color #495057
  padding 16px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  margin-bottom 16px
  text-align center

.tree-grid
  display block
  padding 16px
  box-sizing border-box
  position relative

.tree-card
  .tree-name
    white-space nowrap
    overflow hidden
    text-overflow ellipsis
    font-size 2em
  background-color #f3f3f3
  padding 16px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  transition all 0.3s ease
  display flex
  flex-direction column
  align-items flex-start
  width 100%
  height auto
  min-height 120px
  margin-bottom 16px
  &:hover
    box-shadow 0 6px 12px rgba(0, 0, 0, 0.15)
    transform scale(1.02)

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
