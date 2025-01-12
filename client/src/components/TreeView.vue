<template lang="pug">
    UpperBanner
    // If there is an error fetching the tree, show an error message
    .error-message(v-if="errorMessage")
      p {{ errorMessage }}
  
    //.main-container
    //  p(v-if="!errorMessage") This is a sample page for the tree. Below is the JSON data.
    //  pre(v-if="!errorMessage") {{ JSON.stringify(tree, null, 2) }}
  
    .canvas-container
      canvas#tree-canvas(
        @mousedown="startDrag" 
        @mousemove="onDrag" 
        @mouseup="endDrag" 
        @mouseleave="endDrag" 
        @wheel="onZoom"
      )
</template>

<script lang="ts">
import { ref, defineComponent, type Ref, onMounted } from "vue";
import UpperBanner from "./UpperBanner.vue";
import { testDraw } from "@/helpers/canvasUtils";

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

    const isDragging = ref(false);
    const lastX = ref(0);
    const lastY = ref(0);
    const scale = ref(1);
    const offsetX = ref(0);
    const offsetY = ref(0);

    const startDrag = (event: MouseEvent) => {
      isDragging.value = true;

      // Save the starting mouse position relative to the current canvas offsets
      lastX.value = event.clientX;
      lastY.value = event.clientY;
    };

    const onDrag = (event: MouseEvent) => {
      if (!isDragging.value) return;

      // Calculate the delta movement based on mouse movement in screen coordinates
      const dx = event.clientX - lastX.value;
      const dy = event.clientY - lastY.value;

      // Update the offsets directly (no scale adjustment needed for "exact" movement)
      offsetX.value += dx;
      offsetY.value += dy;

      // Save the current mouse position for the next event
      lastX.value = event.clientX;
      lastY.value = event.clientY;

      drawCanvas();
    };

    const endDrag = () => {
      isDragging.value = false;
    };

    const onZoom = (event: WheelEvent) => {
      // Prevent the default scroll behavior (optional, but makes zoom feel more natural)
      event.preventDefault();

      // Get the mouse position relative to the canvas
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const mouseX = event.clientX - canvas.getBoundingClientRect().left;
      const mouseY = event.clientY - canvas.getBoundingClientRect().top;

      // Get the current scale
      const currentScale = scale.value;

      // Zoom in or out
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

      // Calculate new scale
      const newScale = currentScale * zoomFactor;

      // Calculate the difference in the mouse position based on the scale change
      const offsetXChange =
        (mouseX - offsetX.value) * (1 - newScale / currentScale);
      const offsetYChange =
        (mouseY - offsetY.value) * (1 - newScale / currentScale);

      // Update the scale
      scale.value = newScale;

      // Adjust the offsets to zoom around the mouse position
      offsetX.value += offsetXChange;
      offsetY.value += offsetYChange;

      // Redraw the canvas with the updated scale and offsets
      drawCanvas();
    };

    const drawCanvas = () => {
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply translation and scaling
      ctx.translate(offsetX.value, offsetY.value);
      ctx.scale(scale.value, scale.value);

      // Use the drawRoundedRect function
      const x = 100;
      const y = 100;
      const width = 400;
      const height = 200;
      const radius = 20; // Adjust the corner radius as needed

      testDraw(ctx);

      ctx.restore();
    };

    onMounted(() => {
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;

      // Adjust the canvas for high DPI displays
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Set actual canvas size based on DPI
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Scale canvas context to match the DPI
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      fetchTreeMetadata();
      drawCanvas();
    });

    return {
      tree,
      errorMessage,
      startDrag,
      onDrag,
      endDrag,
      onZoom,
      drawCanvas,
    };
  },
});
</script>

<style lang="stylus" scoped>
/* Set up the overall layout */
.main-container
  display flex
  flex-direction column
  height 100vh // Use the full viewport height

.canvas-container
  flex-grow 1 // Take up the remaining space
  display flex
  justify-content center
  align-items center
  overflow hidden // Hide overflowing content

#tree-canvas
  width 100%
  height 100%
  border 1px solid #000
  cursor grab
</style>
