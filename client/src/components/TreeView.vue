/** Displays the loaded tree and handles user interactions with it. The tree is
rendered on an HTML canvas element, and the user can pan, zoom, and select
nodes. The component also includes a sidebar with tools for interacting with the
tree, such as adding new nodes, editing nodes, and jumping to a specific person
in the tree. */

<template lang="pug">
    UpperBanner
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
        :hasEditPerms="hasEditPerms"
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
    // The ID of the tree to display
    treeId: {
      type: String,
      required: true,
    },
  },

  setup(props) {
    // Reactive variables

    // The canvas element
    const canvas = ref(
      document.getElementById("tree-canvas") as HTMLCanvasElement
    );
    // The tree data
    const tree: Ref<TreeWithMembers | null> = ref(null);
    // Error message to display if fetching the tree fails
    const errorMessage: Ref<string | null> = ref(null);
    // The objects to render on the canvas
    const renderedObjects: Ref<DrawableObject[]> = ref([]);
    // Whether the user is currently dragging the canvas
    const isDragging = ref(false);
    // Whether the user has dragged the canvas
    const wasDragged = ref(false);
    // The currently selected tool
    const selectedTool = ref<Tool>(Tool.PAN);
    // The currently selected object
    const selectedItem = ref<DrawableObject | null>(null);
    // The object currently being hovered over
    const hoveredObject = ref<DrawableObject | null>(null);
    // Whether the context menu is visible
    const contextMenuVisible = ref(false);
    // The position of the context menu
    const contextMenuPosition: Ref<Position> = ref({ x: 0, y: 0 });
    // Whether the user has edit permissions for the tree
    const hasEditPerms = ref(false);
    // The type of context menu to show
    const contextMenuType = ref<ContextMenuType>(ContextMenuType.CANVAS);
    // Whether to show the jump modal
    const showJumpModal = ref(false);
    // The ID of the current focal point
    const currentFocalPoint: Ref<string | null> = ref(null);
    // Whether to show the person modal
    const showPersonModal = ref(false);

    // Coordinate refs
    // The last mouse X and Y coordinates
    const lastX = ref(0);
    const lastY = ref(0);
    // The current scale, X offset, and Y offset
    const scale = ref(1);
    const offsetX = ref(0);
    const offsetY = ref(0);

    // Calculate the canvas coordinates given a mouse event
    // Adjusts for scaling and offset from panning
    const calcOriginalCoords = (event: MouseEvent): Position => {
      const rect = canvas.value.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;

      // Adjust for scaling and offset
      const originalX = (canvasX - offsetX.value) / scale.value;
      const originalY = (canvasY - offsetY.value) / scale.value;

      return { x: originalX, y: originalY };
    };

    /*
    NAME
      changeTool - Changes the selected tool
    
    SYNOPSIS
      (tool: Tool) => void

    DESCRIPTION
      Changes the selected tool to the one specified. If the tool is the jump
      tool, shows the jump modal. If the tool is the home tool, redirects the
      user to the user page. If the tool is the pan tool, changes the cursor to
      a grab cursor. Otherwise, changes the cursor to the default cursor.

    RETURNS
      void
    */
    const changeTool = (tool: Tool) => {
      // If jumping, show the modal, otherwise, cancel it
      if (tool === Tool.JUMP_TO) {
        showJumpModal.value = true;
      } else {
        showJumpModal.value = false;
      }

      // If this is the home tool, return to user page
      if (tool === Tool.HOME) {
        window.location.href = "/trees";
        return;
      }

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
    /* changeTool */

    /*
    NAME
      setupCanvas - Sets up the canvas element
    
    SYNOPSIS
      () => void

    DESCRIPTION
      Sets up the canvas element by getting the canvas element from the DOM,
      setting the device pixel ratio, setting the canvas resolution, scaling the
      drawing context, and adding a resize observer to the canvas container.

    RETURNS
      void
    */
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

      // Scale drawing context for different DPRs
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
    /* setupCanvas */

    /*
    NAME
      fetchTreeMetadata - Fetches the tree metadata

    SYNOPSIS
      (focalId?: string) => Promise<void>
        focalId  --> the ID of the person to center the canvas on

    DESCRIPTION
      Fetches the tree metadata using the treeId prop. If the focalId is
      provided, centers the canvas on the person with that ID. If the user has
      edit permissions for the tree, sets hasEditPerms to true. If the fetch
      fails, sets the error message to display an error message.

    RETURNS
      A promise that resolves when the tree metadata is fetched
    */
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

        // Set the tree value and check for edit permissions
        tree.value = await response.json();
        const userId = localStorage.getItem("userId");
        hasEditPerms.value =
          userId && tree.value
            ? tree.value.metadata.editors.includes(userId) ||
              tree.value.metadata.creator === userId
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
    /* fetchTreeMetadata */

    /*
    NAME
      startDrag - Starts dragging the canvas

    SYNOPSIS
      (event: MouseEvent) => void
        event  --> the mouse event that triggered the drag

    DESCRIPTION
      Starts dragging the canvas by setting the last mouse X and Y coordinates
      and setting isDragging to true. If the selected tool is the pan tool,
      changes the cursor to a closed hand. If the selected tool is the select
      tool, checks if the user is dragging a selected object and starts dragging
      it. If the user is on a selected node, starts dragging it.

    RETURNS
      void
    */
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
    /* startDrag */

    /*
    NAME
      onMouseMove - Handles mouse movement on the canvas

    SYNOPSIS
      (event: MouseEvent) => void
        event  --> the mouse event that triggered the movement

    DESCRIPTION
      Handles mouse movement on the canvas. Changes behavior based on the
      selected tool.

    RETURNS
      void
    */
    const onMouseMove = (event: MouseEvent) => {
      if (isDragging.value) return onDrag(event);

      if (selectedTool.value === Tool.PAN) {
        return;
      } else if (selectedTool.value === Tool.SELECT) {
        // Check if the mouse is hovering over an object
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
    /* onMouseMove */

    /*
    NAME
      onDrag - Handles dragging the canvas

    SYNOPSIS
      (event: MouseEvent) => void
        event  --> the mouse event that triggered the drag

    DESCRIPTION
      Handles dragging the canvas. Calculates new coordinates based on offset
      and current scale.
    */
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
    /* onDrag */

    // End dragging the canvas and reset the cursor
    const endDrag = () => {
      isDragging.value = false;
      if (canvas.value.style.cursor === "grabbing")
        canvas.value.style.cursor = "grab";
    };

    /*
    NAME
      onZoom - Handles zooming the canvas

    SYNOPSIS
      (event: WheelEvent) => void
        event  --> the wheel event that triggered the zoom

    DESCRIPTION
      Handles zooming the canvas. Calculates the new scale based on the zoom
      factor and the mouse position. Updates the scale, offset, and redraws the
      canvas.

    RETURNS
      void
    */
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
    /* onZoom */

    /*
    NAME
      onCanvasClick - Handles clicking on the canvas

    SYNOPSIS
      (event: MouseEvent) => void
        event  --> the mouse event that triggered the click

    DESCRIPTION
      Handles clicks on the canvas. Changes behavior based on the selected tool.
    */
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

      // If the user is in select mode, select the object
      if (clickedObject && selectedTool.value === Tool.SELECT) {
        selectedItem.value = clickedObject;
        canvas.value.style.cursor = "grab";
        updateSelectionBox(clickedObject, renderedObjects.value);
      }
      // If the user clicked outside the object, deselect it
      else if (!clickedObject && selectedTool.value === Tool.SELECT) {
        selectedItem.value = null;
        updateSelectionBox(null, renderedObjects.value);
      }
    };

    // Handle double-clicking to rehome the focal point
    const onDoubleClick = () => {
      if (selectedTool.value === Tool.SELECT) {
        if (selectedItem.value instanceof DrawableNode) {
          // Rehome the focal point
          reloadTree(selectedItem.value.node.id);
          selectedItem.value = null;
        }
      }
    };

    /*
    NAME
      onRightClick - Handles right-clicking on the canvas

    SYNOPSIS
      (event: MouseEvent) => void
        event  --> the mouse event that triggered the right-click

    DESCRIPTION
      Handles right-clicking on the canvas. If the user is in select mode, tries
      to select an object. Determines the type of context menu to show based on
      the selected object.

    RETURNS
      void
    */
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

      // Change cursor
      canvas.value.style.cursor = "default";

      const canvasRect = canvas.value.getBoundingClientRect();
      const menuX = event.clientX - canvasRect.left;
      const menuY = event.clientY - canvasRect.top;

      // Update context menu position
      contextMenuPosition.value = { x: menuX, y: menuY };
      contextMenuVisible.value = true;
    };
    /* onRightClick */

    // Sets up objects on the canvas, links to the drawn objects via event bus,
    // and centers the canvas on the focal point
    const setupObjects = () => {
      const ctx = canvas.value.getContext("2d");
      if (!ctx) return;
      if (tree.value) renderedObjects.value = drawObjects(ctx, tree.value);

      // Listen for the `drawableUpdated` event
      eventBus.on("updatedDrawable", drawCanvas);

      centerOnFocalPoint(renderedObjects.value);
    };

    /*
    NAME
      drawCanvas - Draws the canvas

    SYNOPSIS
      () => void

    DESCRIPTION
      Draws the canvas by clearing the canvas, setting up the drawing context,
      and redrawing the objects on the canvas. If the tree is not loaded, exits
      the function. If the tree is loaded but the objects are not rendered, draws
      the objects. Otherwise, redraws the canvas with the rendered objects.

    RETURNS
      void
    */
    const drawCanvas = () => {
      const ctx = canvas.value.getContext("2d");
      if (!ctx) return;

      // Clear the canvas and set up the drawing context
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
    /* drawCanvas */

    /*
    NAME
      centerCanvas - Centers the canvas on a given point

    SYNOPSIS
      (centerX: number, centerY: number) => void
        centerX  --> the X-coordinate to center the canvas on
        centerY  --> the Y-coordinate to center the canvas on

    DESCRIPTION
      Centers the canvas on a given point by calculating the offset to center
      the content and redrawing the canvas with the updated offsets.

    RETURNS
      void
    */
    const centerCanvas = (centerX: number, centerY: number) => {
      const dpr = window.devicePixelRatio || 1; // Account for high-DPI screens

      // Convert canvas dimensions to logical dimensions
      const canvasWidth = canvas.value.width / dpr / scale.value;
      const canvasHeight = canvas.value.height / dpr / scale.value;

      // Calculate the offset to center the content
      offsetX.value = (canvasWidth / 2 - centerX) * scale.value;
      offsetY.value = (canvasHeight / 2 - centerY) * scale.value;

      // Redraw with updated offsets
      drawCanvas();
    };
    /* centerCanvas */

    // Centers the canvas on the focal point
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
      }
    };

    // Hides the context menu
    const hideContextMenu = () => {
      contextMenuVisible.value = false;
    };

    /*
    NAME
      createNode - Creates a new node on the canvas

    SYNOPSIS
      (event: MouseEvent) => void
        event  --> the mouse event that triggered the creation

    DESCRIPTION
      Sends a request to the server to create a new node. If the request is
      successful, adds the new node to the tree and selects it.
    */
    const createNode = async (event: MouseEvent) => {
      if (!tree.value) return;

      // Send a request to create a new node
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

      // Add the new node to the tree
      const newPerson = (await response.json()).person as TreeMember;
      const currentCoords = calcOriginalCoords(event);
      const canvasState = {
        ctx: canvas.value.getContext("2d")!,
        x: currentCoords.x,
        y: currentCoords.y,
      };

      // Create a drawable object for the new node
      const newDrawable = addMemberToDrawing(
        newPerson,
        renderedObjects.value,
        canvasState
      );
      // Select the new node
      selectedItem.value = newDrawable;
    };
    /* createNode */

    // Toggle the person modal to edit the selected item
    const editItem = () => {
      // If the item is a node, show the Person View
      if (selectedItem.value instanceof DrawableNode) {
        showPersonModal.value = true;
      }
    };

    /*
    NAME
      deleteItem - Deletes the selected item

    SYNOPSIS
      () => void

    DESCRIPTION
      Deletes the selected item. If the selected item contains multiple child relationships,
      deletes those as well. Reloads the tree after deletion.

    RETURNS
      void
    */
    const deleteItem = async () => {
      if (!selectedItem.value) return;

      // Delete a node
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
      }

      // Delete a relationship
      else if (selectedItem.value instanceof DrawableRelationship) {
        const originIds = selectedItem.value.relationship.fromNodes.map(
          (node) => node.id
        );
        const targetId = selectedItem.value.relationship.toNode.id;

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
      // Reload the tree after deletion
      reloadTree();
    };

    // Change the picture of the selected item
    const changePicture = (newImageUrl: string) => {
      (selectedItem.value as DrawableNode).replaceImage(newImageUrl);
    };

    // Change the name of the selected item
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
        `${firstName ?? ""} ${middleName ?? ""} ${lastName ?? ""}`
      );
    };

    /*
    NAME
      reloadTree - Reloads the tree

    SYNOPSIS
      (focalId?: string) => Promise<void>
        focalId  --> the ID of the person to center the canvas on

    DESCRIPTION
      Reloads the tree by fetching the tree metadata and redrawing the canvas.
      If the focalId is provided, centers the canvas on the person with that ID.
      If the user is on the jump tool, switches to the pan tool.

    RETURNS
      A promise that resolves when the tree is reloaded
    */
    const reloadTree = async (focalId?: string) => {
      if (focalId) currentFocalPoint.value = focalId;
      // Switch to pan tool if on jump tool
      if (selectedTool.value === Tool.JUMP_TO) {
        changeTool(Tool.PAN);
      }

      // Reload canvas values
      setupCanvas();
      await fetchTreeMetadata(currentFocalPoint.value ?? undefined);
      setupObjects();
    };
    /* reloadTree */

    // Jump to a person by reloading with them as the focal point
    const jumpToPerson = (selectedPerson: TreeMember) => {
      reloadTree(selectedPerson.id);
    };

    // On mount, set the canvas and objects up and fetch the tree metadata
    onMounted(async () => {
      setupCanvas();
      await fetchTreeMetadata();
      setupObjects();
      document.addEventListener("click", hideContextMenu);
    });

    // On unmount, remove event listeners
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
