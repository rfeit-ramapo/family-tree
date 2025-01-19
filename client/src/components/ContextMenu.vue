/** * This component handles the context menu overrides for the tree, nodes, and
relationships. It displays custom context menu items based on the context menu
type and the user's permissions. */

<template lang="pug">
.tree-context-menu(
  v-if="contextMenuVisible && hasMenuItems", 
  :style="{ top: `${contextMenuPosition.y}px`, left: `${contextMenuPosition.x}px`, position: 'absolute' }"
  )
  ul.context-menu-list
    li.context-menu-item(v-if="showViewOption()" @click="emitEvent(ContextMenuEvent.VIEW, $event)") View
    li.context-menu-item(v-if="showRenameOption()" @click="emitEvent(ContextMenuEvent.RENAME, $event)") Rename
    li.context-menu-item(v-if="showEditOption()" @click="emitEvent(ContextMenuEvent.EDIT, $event)") Edit
    li.context-menu-item(v-if="showDeleteOption()" @click="emitEvent(ContextMenuEvent.DELETE, $event)") Delete
    li.context-menu-item(v-if="showAddNodeOption()" @click="emitEvent(ContextMenuEvent.ADD_NODE, $event)") Create Node
    li.context-menu-item(v-if="showPublicOption()" @click="emitEvent(ContextMenuEvent.PUBLIC)")
      span(v-if="isPublic") Make Private
      span(v-else) Make Public
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from "vue";
import { ContextMenuType, ContextMenuEvent } from "../helpers/sharedTypes";

export default defineComponent({
  name: "ContextMenu",
  props: {
    // The type of context menu to display
    contextMenuType: {
      type: Number as PropType<number>,
      required: true,
    },
    // Whether the context menu is visible
    contextMenuVisible: {
      type: Boolean,
      default: false,
    },
    // The position of the context menu
    contextMenuPosition: {
      type: Object as PropType<{ x: number; y: number }>,
      default: () => ({ x: 0, y: 0 }),
    },
    // Whether the user has edit permissions
    hasEditPerms: {
      type: Boolean,
      default: true,
    },
    // Whether the tree is public
    isPublic: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit }) {
    // Determines whether to show the rename option
    // Only shows for tree context menu
    const showRenameOption = () => {
      if (!props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.TREE;
    };

    // Determines whether to show the view option
    // Only shows for node context menu
    const showViewOption = () => {
      if (props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.NODE;
    };

    // Determines whether to show the edit option
    // Only shows for node context menu
    const showEditOption = () => {
      if (!props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.NODE;
    };

    // Determines whether to show the delete option
    // Shows for node, partner/parent relationship, and tree context menus
    const showDeleteOption = () => {
      if (!props.hasEditPerms) return false;
      return (
        props.contextMenuType === ContextMenuType.NODE ||
        props.contextMenuType === ContextMenuType.PARTNER_REL ||
        props.contextMenuType === ContextMenuType.PARENT_REL ||
        props.contextMenuType === ContextMenuType.TREE
      );
    };

    // Determines whether to show the add node option
    // Only shows for canvas context menu
    const showAddNodeOption = () => {
      if (!props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.CANVAS;
    };

    // Determines whether to show the public option
    // Only shows for tree context menu
    const showPublicOption = () => {
      return props.contextMenuType === ContextMenuType.TREE;
    };

    // Emits a context menu event depending on what was clicked
    const emitEvent = (eventType: ContextMenuEvent, event: MouseEvent) => {
      emit(eventType, event);
    };

    // Computed property that determines whether the context menu has any menu items
    const hasMenuItems = computed(() => {
      return (
        showRenameOption() ||
        showEditOption() ||
        showDeleteOption() ||
        showAddNodeOption() ||
        showViewOption() ||
        showPublicOption()
      );
    });

    return {
      showViewOption,
      showRenameOption,
      showEditOption,
      showDeleteOption,
      showAddNodeOption,
      showPublicOption,
      hasMenuItems,
      emitEvent,
      ContextMenuEvent,
    };
  },
});
</script>

<style lang="stylus">
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
