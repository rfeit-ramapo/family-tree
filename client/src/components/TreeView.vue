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
        @click="onCanvasClick"
      )
</template>

<script lang="ts">
import { ref, defineComponent, type Ref, onMounted } from "vue";
import UpperBanner from "./UpperBanner.vue";
import {
  DrawableObject,
  isClickInsideObject,
  testDraw,
} from "@/helpers/canvasUtils";
import type { TreeWithMembers } from "@/helpers/treeToNodes";

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
    const tree: Ref<TreeWithMembers | null> = ref(null);
    const errorMessage: Ref<string | null> = ref(null);
    const renderedObjects: Ref<DrawableObject[]> = ref([]);
    const isDragging = ref(false);
    const wasDragged = ref(false);

    const fetchTreeMetadata = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
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
        console.log("Focal Point", tree.value?.focalPoint);
        console.log("Tree", tree.value);
        errorMessage.value = null;
      } catch (error) {
        console.error("Error fetching the tree:", error);
        errorMessage.value =
          error instanceof Error
            ? error.message
            : "There was an error fetching the tree. Please try again later.";
        tree.value = null;
      }
    };

    const lastX = ref(0);
    const lastY = ref(0);
    const scale = ref(1);
    const offsetX = ref(0);
    const offsetY = ref(0);

    const startDrag = (event: MouseEvent) => {
      isDragging.value = true;
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

      // Stop mouse clicks from occurring if the user is dragging
      if (dx || dy) {
        wasDragged.value = true;
      }

      drawCanvas();
    };

    const endDrag = () => {
      isDragging.value = false;
    };

    const onZoom = (event: WheelEvent) => {
      event.preventDefault();
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const mouseX = event.clientX - canvas.getBoundingClientRect().left;
      const mouseY = event.clientY - canvas.getBoundingClientRect().top;
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newScale = scale.value * zoomFactor;
      const offsetXChange =
        (mouseX - offsetX.value) * (1 - newScale / scale.value);
      const offsetYChange =
        (mouseY - offsetY.value) * (1 - newScale / scale.value);
      scale.value = newScale;
      offsetX.value += offsetXChange;
      offsetY.value += offsetYChange;
      drawCanvas();
    };

    const onCanvasClick = (event: MouseEvent) => {
      // Prevent clicking if dragging
      if (wasDragged.value) {
        wasDragged.value = false;
        return;
      }

      // Mouse click coordinates relative to the canvas
      const canvas = event.target as HTMLCanvasElement;
      const mouseX = event.offsetX;
      const mouseY = event.offsetY;

      // Calculate original coordinates before scaling and offset were applied
      const originalX = (mouseX - offsetX.value) / scale.value;
      const originalY = (mouseY - offsetY.value) / scale.value;

      // Log the original coordinates (before zoom and pan)
      alert(`You clicked the Canvas at (${mouseX}, ${mouseY})
    Original Coordinates: (${originalX.toFixed(2)}, ${originalY.toFixed(2)})`);

      // Check if the click is inside any rendered object
      const clickedObject = isClickInsideObject(
        { x: originalX, y: originalY },
        renderedObjects.value
      );
      if (clickedObject) {
        alert(`Clicked on object with ID: ${clickedObject.id}`);
      }
    };

    const drawCanvas = () => {
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offsetX.value, offsetY.value);
      ctx.scale(scale.value, scale.value);

      if (tree.value) renderedObjects.value = testDraw(ctx, tree.value);

      ctx.restore();
    };

    onMounted(async () => {
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      await fetchTreeMetadata();
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
      onCanvasClick,
    };
  },
});
</script>

<style lang="stylus" scoped>
.main-container
  display flex
  flex-direction column
  height 100vh

.canvas-container
  flex-grow 1
  display flex
  justify-content center
  align-items center
  overflow hidden

#tree-canvas
  width 100%
  height 100%
  border 1px solid #000
  cursor grab
</style>
