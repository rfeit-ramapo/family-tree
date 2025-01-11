<template lang="pug">
  UpperBanner
  // If there is an error fetching the tree, show an error message
  .error-message(v-if="errorMessage")
    p {{ errorMessage }}

  p(v-if="!errorMessage") This is a sample page for the tree. Below is the json data.
    pre {{ JSON.stringify(tree, null, 2) }}

</template>

<script lang="ts">
import { ref, defineComponent, type Ref, onMounted } from "vue";
import UpperBanner from "./UpperBanner.vue";

interface Tree {
  creator: string;
  name: string;
  id: string;
  dateCreated: Date;
  lastModified: Date;
}

export default defineComponent({
  name: "TreeView",
  components: {
    UpperBanner,
  },
  props: {
    treeId: {
      type: String,
      required: true, // The treeId must be provided
    },
  },
  setup(props) {
    const tree: Ref<Tree | null> = ref(null);
    const errorMessage: Ref<string | null> = ref(null);

    const fetchTreeMetadata = async () => {
      try {
        const token = localStorage.getItem("token"); // Optional token for logged-in users
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`; // Add token if available
        }

        // Fetch tree metadata using the treeId prop
        const response = await fetch(`/api/tree/${props.treeId}`, {
          headers,
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You do not have permission to view this tree.");
          } else if (response.status === 404) {
            throw new Error("Tree not found.");
          } else {
            throw new Error("Failed to fetch tree metadata.");
          }
        }

        tree.value = await response.json();
        errorMessage.value = null; // Clear any previous error
      } catch (error) {
        console.error("Error fetching the tree:", error);
        errorMessage.value =
          error instanceof Error
            ? error.message
            : "There was an error fetching the tree. Please try again later.";
        tree.value = null; // Reset the tree data in case of an error
      }
    };

    onMounted(fetchTreeMetadata);

    return {
      tree,
      errorMessage,
    };
  },
});
</script>
