<template lang="pug">
    UpperBanner
    // If there is an error fetching the tree, show an error message
    .error-message(v-if="errorMessage")
      p {{ errorMessage }}

    JumpToPerson(
      :treeId="treeId"
      v-if="showJumpModal"
      @close="changeTool(Tool.PAN)"
      @select="jumpToPerson"
    )
  
    PersonView(
      :personId="selectedItem.node.id"
      v-if="showPersonModal" 
      @close="showPersonModal = false"
      @changePicture="changePicture"
      @changeName="changeName"
      @reloadTree="reloadTree"
    )
  
    .canvas-container(v-if="!errorMessage")
      canvas#tree-canvas(
        @mousedown="startDrag"
        @mousemove="onMouseMove"
        @mouseup="endDrag"
        @mouseleave="endDrag"
        @wheel="onZoom"
        @click="onCanvasClick"
        @dblclick="onDoubleClick"
        @hover="onHover"
        @contextmenu.prevent="onRightClick($event)"
      )

      ContextMenu(
        :contextMenuType="contextMenuType"
        :contextMenuVisible="contextMenuVisible"
        :contextMenuPosition="contextMenuPosition"
        :editPerms="hasEditPerms"
        @edit="editItem"
        @delete="deleteItem"
        @add-node="createNode"
        @view="editItem"
      )
    SideBar(:selectedTool="selectedTool" @toolChange="changeTool")
</template>

<script lang="ts">
import { ref, defineComponent, type Ref, onMounted, onUnmounted } from "vue";
import UpperBanner from "./UpperBanner.vue";
import SideBar, { Tool } from "./SideBar.vue";
import {
  addMemberToDrawing,
  DrawableNode,
  DrawableObject,
  DrawableRelationship,
  drawObjects,
  isPointInsideObject,
  PartnerRelationship,
  redraw,
  updateSelectionBox,
  type Position,
} from "@/helpers/canvasUtils";
import type { TreeMember, TreeWithMembers } from "@/helpers/treeToNodes";
import eventBus from "@/helpers/eventBus";
import { ContextMenuType } from "@/helpers/sharedTypes";
import ContextMenu from "./ContextMenu.vue";
import PersonView from "./PersonView.vue";
import JumpToPerson from "./JumpToPerson.vue";

export default defineComponent({
  name: "TreeView",
  components: {
    UpperBanner,
    SideBar,
    ContextMenu,
    PersonView,
    JumpToPerson,
  },
  props: {
    treeId: {
      type: String,
      required: true, // The treeId must be provided
    },
  },
  setup(props) {
    const canvas = ref(
      document.getElementById("tree-canvas") as HTMLCanvasElement
    );
    const tree: Ref<TreeWithMembers | null> = ref(null);
    const errorMessage: Ref<string | null> = ref(null);
    const renderedObjects: Ref<DrawableObject[]> = ref([]);
    const isDragging = ref(false);
    const wasDragged = ref(false);
    const selectedTool = ref<Tool>(Tool.PAN);
    const selectedItem = ref<DrawableObject | null>(null);
    const hoveredObject = ref<DrawableObject | null>(null);
    const contextMenuVisible = ref(false);
    const contextMenuPosition: Ref<Position> = ref({ x: 0, y: 0 });
    const hasEditPerms = ref(false);
    const contextMenuType = ref<ContextMenuType>(ContextMenuType.CANVAS);
    const showJumpModal = ref(false);

    const calcOriginalCoords = (event: MouseEvent): Position => {
      const rect = canvas.value.getBoundingClientRect(); // Get canvas bounds
      const canvasX = event.clientX - rect.left; // Mouse X relative to canvas
      const canvasY = event.clientY - rect.top; // Mouse Y relative to canvas

      // Adjust for scaling and offset
      const originalX = (canvasX - offsetX.value) / scale.value;
      const originalY = (canvasY - offsetY.value) / scale.value;

      return { x: originalX, y: originalY };
    };

    const changeTool = (tool: Tool) => {
      // If jumping, show the modal, otherwise, cancel it
      if (tool === Tool.JUMP_TO) {
        showJumpModal.value = true;
      } else {
        showJumpModal.value = false;
      }

      console.log("changing tool to", tool);
      // Deselect anything on tool change
      selectedItem.value = null;
      updateSelectionBox(null, renderedObjects.value);

      selectedTool.value = tool;
      if (tool === Tool.PAN) {
        canvas.value.style.cursor = "grab";
      } else {
        canvas.value.style.cursor = "default";
      }
    };

    const setupCanvas = () => {
      canvas.value = document.getElementById(
        "tree-canvas"
      ) as HTMLCanvasElement;
      const ctx = canvas.value.getContext("2d");

      // Get device pixel ratio
      const dpr = window.devicePixelRatio || 1;

      // Set canvas resolution (in pixels)
      const displayWidth = canvas.value.clientWidth;
      const displayHeight = canvas.value.clientHeight;

      canvas.value.width = displayWidth * dpr;
      canvas.value.height = displayHeight * dpr;

      // Scale drawing context to handle high-DPI screens
      ctx?.scale(dpr, dpr);
      canvas.value.style.cursor = "grab";

      const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const container = canvas.value?.parentElement;
        if (!container || !canvas.value) return;

        // Get the container's computed dimensions
        const styles = window.getComputedStyle(container);
        const containerWidth = parseInt(styles.width, 10);
        const containerHeight = parseInt(styles.height, 10);

        // Update canvas size maintaining aspect ratio
        canvas.value.style.width = `${containerWidth}px`;
        canvas.value.style.height = `${containerHeight}px`;

        // Set actual canvas dimensions accounting for DPR
        canvas.value.width = containerWidth * dpr;
        canvas.value.height = containerHeight * dpr;

        // Scale the context to handle the device pixel ratio
        ctx?.scale(dpr, dpr);

        // Redraw canvas contents
        drawCanvas();
      };

      // Add resize observer for the canvas container
      const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });

      if (canvas.value.parentElement) {
        resizeObserver.observe(canvas.value.parentElement);
      }
    };

    const fetchTreeMetadata = async (focalId?: string) => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Fetch tree metadata using the treeId prop
        const querySection = focalId ? `?focalId=${focalId}` : "";
        const response = await fetch(
          `/api/tree/${props.treeId}${querySection}`,
          {
            headers,
          }
        );

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
        const userId = localStorage.getItem("userId");
        hasEditPerms.value =
          userId && tree.value
            ? tree.value.metadata.editors.includes(userId)
            : false;
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
      lastX.value = event.clientX;
      lastY.value = event.clientY;

      if (selectedTool.value === Tool.PAN) {
        isDragging.value = true;

        // Change the cursor to a closed hand while dragging
        canvas.value.style.cursor = "grabbing";
      } else if (selectedTool.value === Tool.SELECT) {
        // If the selected object is a relationship, don't allow dragging
        if (selectedItem.value instanceof DrawableRelationship) {
          return;
        }
        // If the user is on a selected node, start dragging it
        const originalCoords = calcOriginalCoords(event);
        if (
          selectedItem.value &&
          selectedItem.value.isInShape({
            x: originalCoords.x,
            y: originalCoords.y,
          })
        ) {
          isDragging.value = true;
          canvas.value.style.cursor = "grabbing";
        }
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isDragging.value) return onDrag(event);

      if (selectedTool.value === Tool.PAN) {
        return;
      } else if (selectedTool.value === Tool.SELECT) {
        // Get mouse coordinates relative to the canvas

        const newHoveredObject = isPointInsideObject(
          calcOriginalCoords(event),
          renderedObjects.value
        );

        // If hovering over a selected object, show the grab cursor
        if (
          newHoveredObject &&
          newHoveredObject?.id === selectedItem.value?.id
        ) {
          canvas.value.style.cursor = "grab";
        }
        // If the user mouses off the hovered object, reset the cursor
        else if (hoveredObject.value && !newHoveredObject) {
          canvas.value.style.cursor = "default";
          hoveredObject.value.toggleHover(false);
          hoveredObject.value = null;
        }

        // If this is a new object, update the hovered object and redraw canvas
        const isNewObject =
          newHoveredObject && newHoveredObject?.id !== hoveredObject.value?.id;

        if (isNewObject) {
          // Apply the hover property to the new drawing
          hoveredObject.value?.toggleHover(false);
          hoveredObject.value = newHoveredObject;
          hoveredObject.value.toggleHover(true);
        }
      }
    };

    const onDrag = (event: MouseEvent) => {
      if (!isDragging.value) return;

      // Calculate the delta movement based on mouse movement in screen coordinates
      const dx = event.clientX - lastX.value;
      const dy = event.clientY - lastY.value;

      if (selectedTool.value === Tool.PAN) {
        // Update the offsets directly
        offsetX.value += dx;
        offsetY.value += dy;
      } else if (selectedTool.value === Tool.SELECT) {
        // If the user is dragging a selected object, move it
        if (selectedItem.value) {
          selectedItem.value.move(dx / scale.value, dy / scale.value);
        }
      }

      // Stop mouse clicks from occurring if the user is dragging
      if (dx || dy) {
        wasDragged.value = true;
      }

      // Save the current mouse position for the next event
      lastX.value = event.clientX;
      lastY.value = event.clientY;

      drawCanvas();
    };

    const endDrag = () => {
      isDragging.value = false;
      if (canvas.value.style.cursor === "grabbing")
        canvas.value.style.cursor = "grab";
    };

    const onHover = (event: MouseEvent) => {
      if (selectedTool.value === Tool.PAN) {
        // show a hand cursor when hovering over the canvas
        canvas.value.style.cursor = "grab";
      }
    };

    const onZoom = (event: WheelEvent) => {
      event.preventDefault();
      const mouseX = event.clientX - canvas.value.getBoundingClientRect().left;
      const mouseY = event.clientY - canvas.value.getBoundingClientRect().top;
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

      if (clickedObject && selectedTool.value === Tool.SELECT) {
        selectedItem.value = clickedObject;
        canvas.value.style.cursor = "grab";
        updateSelectionBox(clickedObject, renderedObjects.value);
      } else if (!clickedObject && selectedTool.value === Tool.SELECT) {
        selectedItem.value = null;
        updateSelectionBox(null, renderedObjects.value);
      }
    };

    const onDoubleClick = (event: MouseEvent) => {
      if (selectedTool.value === Tool.SELECT) {
        if (selectedItem.value instanceof DrawableNode) {
          // Rehome the focal point
          reloadTree(selectedItem.value.node.id);
          selectedItem.value = null;
        }
      }
    };

    const onRightClick = (event: MouseEvent) => {
      // Exit if not in select mode
      if (selectedTool.value !== Tool.SELECT) return;

      // Try to select an object
      onCanvasClick(event);

      // Determine the type of context menu to show
      contextMenuType.value = !selectedItem.value
        ? ContextMenuType.CANVAS
        : selectedItem.value instanceof DrawableNode
          ? ContextMenuType.NODE
          : (selectedItem.value as DrawableRelationship).relationship instanceof
              PartnerRelationship
            ? ContextMenuType.PARTNER_REL
            : ContextMenuType.PARENT_REL;

      // Show custom context menu

      // Change cursor
      canvas.value.style.cursor = "default";

      const canvasRect = canvas.value.getBoundingClientRect();
      const menuX = event.clientX - canvasRect.left;
      const menuY = event.clientY - canvasRect.top;

      // Update context menu position
      contextMenuPosition.value = { x: menuX, y: menuY };
      contextMenuVisible.value = true;
    };

    const setupObjects = () => {
      const ctx = canvas.value.getContext("2d");
      if (!ctx) return;
      if (tree.value) renderedObjects.value = drawObjects(ctx, tree.value);

      // Listen for the `drawableUpdated` event
      eventBus.on("updatedDrawable", drawCanvas);

      centerOnFocalPoint(renderedObjects.value);
    };

    const drawCanvas = () => {
      const ctx = canvas.value.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
      ctx.save();
      ctx.translate(offsetX.value, offsetY.value);
      ctx.scale(scale.value, scale.value);

      if (tree.value && !renderedObjects.value)
        renderedObjects.value = drawObjects(ctx, tree.value);
      else if (renderedObjects.value) {
        redraw(ctx, renderedObjects.value);
      }

      ctx.restore();
    };

    const centerCanvas = (centerX: number, centerY: number) => {
      const dpr = window.devicePixelRatio || 1; // Account for high-DPI screens

      // Convert canvas dimensions to logical dimensions
      const canvasWidth = canvas.value.width / dpr / scale.value;
      const canvasHeight = canvas.value.height / dpr / scale.value;

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

    const hideContextMenu = () => {
      contextMenuVisible.value = false;
    };

    const createNode = async (event: MouseEvent) => {
      if (!tree.value) return;

      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/person`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          treeId: tree.value.metadata.id,
        }),
      });

      if (!response.ok) {
        console.error("Failed to create node:", response.statusText);
        return;
      }

      const newPerson = (await response.json()).person as TreeMember;
      const currentCoords = calcOriginalCoords(event);
      const canvasState = {
        ctx: canvas.value.getContext("2d")!,
        x: currentCoords.x,
        y: currentCoords.y,
      };

      // Add the new node to the tree
      const newDrawable = addMemberToDrawing(
        newPerson,
        renderedObjects.value,
        canvasState
      );
      selectedItem.value = newDrawable;
    };

    const showPersonModal = ref(false);
    const editItem = () => {
      // If the item is a node, show the Person View
      if (selectedItem.value instanceof DrawableNode) {
        showPersonModal.value = true;
      }
    };

    const deleteItem = async () => {
      if (!selectedItem.value) return;
      if (selectedItem.value instanceof DrawableNode) {
        const nodeId = selectedItem.value.id;

        try {
          const token = localStorage.getItem("token");
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };

          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const response = await fetch(`/api/person/remove/${nodeId}`, {
            method: "POST",
            headers,
          });

          if (!response.ok) {
            console.error("Failed to delete node:", response.statusText);
            return;
          }
        } catch (error) {
          console.error("Error deleting node:", error);
        }
      } else if (selectedItem.value instanceof DrawableRelationship) {
        const originIds = selectedItem.value.relationship.fromNodes;
        const targetId = selectedItem.value.relationship.toNode;

        for (const originId of originIds) {
          try {
            const token = localStorage.getItem("token");
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };

            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(
              `/api/connection/remove/${originId}/${targetId}/`,
              {
                method: "POST",
                headers,
              }
            );

            if (!response.ok) {
              console.error(
                "Failed to delete relationship:",
                response.statusText
              );
              return;
            }
          } catch (error) {
            console.error("Error deleting relationship:", error);
          }
        }
      }
      reloadTree();
    };

    const changePicture = (newImageUrl: string) => {
      (selectedItem.value as DrawableNode).replaceImage(newImageUrl);
    };

    const changeName = ({
      firstName,
      middleName,
      lastName,
    }: {
      firstName: string;
      middleName: string;
      lastName: string;
    }) => {
      (selectedItem.value as DrawableNode).replaceName(
        `${firstName ?? ""}${middleName ?? ""} ${lastName ?? ""}`
      );
    };

    const reloadTree = async (focalId?: string) => {
      // Switch to pan tool if on jump tool
      if (selectedTool.value === Tool.JUMP_TO) {
        changeTool(Tool.PAN);
      }

      // Reload canvas values
      setupCanvas();
      await fetchTreeMetadata(focalId);
      setupObjects();
    };

    const jumpToPerson = (selectedPerson: TreeMember) => {
      reloadTree(selectedPerson.id);
    };

    onMounted(async () => {
      setupCanvas();

      await fetchTreeMetadata();
      setupObjects();
      document.addEventListener("click", hideContextMenu);
    });

    onUnmounted(() => {
      eventBus.off("updatedDrawable", drawCanvas);
      document.removeEventListener("click", hideContextMenu);
    });

    return {
      onDoubleClick,
      reloadTree,
      changePicture,
      changeName,
      editItem,
      deleteItem,
      selectedItem,
      showPersonModal,
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
      createNode,
      selectedTool,
      Tool,
      onRightClick,
      contextMenuVisible,
      contextMenuPosition,
      contextMenuType,
      ContextMenuType,
      hasEditPerms,
      jumpToPerson,
      showJumpModal,
    };
  },
});
</script>

<style lang="stylus" scoped>
html, body, #app
  height 100vh
  margin 0
  padding 0
  overflow hidden

.canvas-container
  position absolute
  top 80px
  left 0
  right 0
  bottom 0
  display flex
  justify-content center
  align-items center
  overflow hidden

#tree-canvas
  width 100%
  height 100%
  border 3px solid #ccc
  box-sizing border-box
</style>
