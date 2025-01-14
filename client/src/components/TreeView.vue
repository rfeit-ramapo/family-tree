<template lang="pug">
    UpperBanner
    // If there is an error fetching the tree, show an error message
    .error-message(v-if="errorMessage")
      p {{ errorMessage }}
  
    //.main-container
    //  p(v-if="!errorMessage") This is a sample page for the tree. Below is the JSON data.
    //  pre(v-if="!errorMessage") {{ JSON.stringify(tree, null, 2) }}
  
    .canvas-container(v-if="!errorMessage")
      canvas#tree-canvas(
        @mousedown="startDrag"
        @mousemove="onMouseMove"
        @mouseup="endDrag"
        @mouseleave="endDrag"
        @wheel="onZoom"
        @click="onCanvasClick"
        @hover="onHover"
      )

    SideBar(@toolChange="changeTool")
</template>

<script lang="ts">
import { ref, defineComponent, type Ref, onMounted } from "vue";
import UpperBanner from "./UpperBanner.vue";
import SideBar, { Tool } from "./SideBar.vue";
import {
  DrawableNode,
  DrawableObject,
  isPointInsideObject,
  testDraw,
} from "@/helpers/canvasUtils";
import type { TreeWithMembers } from "@/helpers/treeToNodes";

export default defineComponent({
  name: "TreeView",
  components: {
    UpperBanner,
    SideBar,
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
    const selectedTool = ref<Tool>(Tool.PAN);
    const selectedItem = ref<DrawableObject | null>(null);

    const changeTool = (tool: Tool) => {
      console.log("changing tool to", tool);
      selectedTool.value = tool;
      if (tool === Tool.PAN) {
        const canvas = document.getElementById(
          "tree-canvas"
        ) as HTMLCanvasElement;
        canvas.style.cursor = "grab";
      }
    };

    const setupCanvas = () => {
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");

      // Get device pixel ratio
      const dpr = window.devicePixelRatio || 1;

      // Set canvas resolution (in pixels)
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;

      // Scale drawing context to handle high-DPI screens
      ctx?.scale(dpr, dpr);
      canvas.style.cursor = "grab";
    };

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
      if (selectedTool.value === Tool.PAN) {
        isDragging.value = true;
        lastX.value = event.clientX;
        lastY.value = event.clientY;

        // Change the cursor to a closed hand while dragging
        const canvas = document.getElementById(
          "tree-canvas"
        ) as HTMLCanvasElement;
        canvas.style.cursor = "grabbing";
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isDragging.value) return onDrag(event);

      if (selectedTool.value === Tool.PAN) {
        return;
      } else if (selectedTool.value === Tool.SELECT) {
        // Get mouse coordinates relative to the canvas
        const canvas = document.getElementById(
          "tree-canvas"
        ) as HTMLCanvasElement;
        const x = event.offsetX;
        const y = event.offsetY;

        const originalX = (x - offsetX.value) / scale.value;
        const originalY = (y - offsetY.value) / scale.value;

        const hoveredObject = isPointInsideObject(
          { x: originalX, y: originalY },
          renderedObjects.value
        );

        if (hoveredObject) {
          canvas.style.cursor = "grab";
        } else {
          canvas.style.cursor = "default";
        }
      }
    };

    const onDrag = (event: MouseEvent) => {
      if (!isDragging.value) return;

      if (selectedTool.value === Tool.PAN) {
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
      }

      drawCanvas();
    };

    const endDrag = () => {
      isDragging.value = false;
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      canvas.style.cursor = "grab";
    };

    const onHover = (event: MouseEvent) => {
      if (selectedTool.value === Tool.PAN) {
        // show a hand cursor when hovering over the canvas
        const canvas = document.getElementById(
          "tree-canvas"
        ) as HTMLCanvasElement;
        canvas.style.cursor = "grab";
      }
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

      // Check if the click is inside any rendered object
      const clickedObject = isPointInsideObject(
        { x: originalX, y: originalY },
        renderedObjects.value
      );
    };

    const setupObjects = () => {
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (tree.value) renderedObjects.value = testDraw(ctx, tree.value);
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

    const centerCanvas = (centerX: number, centerY: number) => {
      const canvas = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1; // Account for high-DPI screens

      // Convert canvas dimensions to logical dimensions
      const canvasWidth = canvas.width / dpr / scale.value;
      const canvasHeight = canvas.height / dpr / scale.value;

      // Calculate the offset to center the content
      offsetX.value = (canvasWidth / 2 - centerX) * scale.value;
      offsetY.value = (canvasHeight / 2 - centerY) * scale.value;

      drawCanvas(); // Redraw with updated offsets
    };

    const centerOnFocalPoint = (renderedObjects: DrawableObject[]) => {
      const focalDrawing = renderedObjects.find((obj) => {
        if (obj instanceof DrawableNode) {
          return obj.node.isFocalPoint;
        }
      }) as DrawableNode | undefined;
      if (focalDrawing) {
        centerCanvas(
          focalDrawing.position.x + focalDrawing.width / 2,
          focalDrawing.position.y
        );

        console.log(
          "centered canvas on:",
          focalDrawing.position.x + focalDrawing.width / 2,
          focalDrawing.position.y
        );
      }
    };

    const isCursorGrab = () => {
      if (selectedTool.value === Tool.PAN) return true;

      if (selectedTool.value == Tool.SELECT && selectedItem.value) {
        // Get mouse coordinates relative to the canvas
        const x = 0;
        const y = 0;
        return selectedItem.value.isInShape({ x: 0, y: 0 });
      }
    };

    onMounted(async () => {
      setupCanvas();

      await fetchTreeMetadata();
      setupObjects();
    });

    return {
      tree,
      errorMessage,
      startDrag,
      // onDrag,
      onMouseMove,
      endDrag,
      onZoom,
      drawCanvas,
      onCanvasClick,
      changeTool,
      onHover,
      selectedTool,
      Tool,
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
  border 3px solid #ccc
</style>
