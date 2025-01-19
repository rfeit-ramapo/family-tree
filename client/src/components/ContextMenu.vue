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
</template>

<script lang="ts">
import { computed, defineComponent, ref, type PropType } from "vue";
import { ContextMenuType, ContextMenuEvent } from "../helpers/sharedTypes";

export default defineComponent({
  name: "ContextMenu",
  props: {
    contextMenuType: {
      type: Number as PropType<number>,
      required: true,
    },
    contextMenuVisible: {
      type: Boolean,
      default: false,
    },
    contextMenuPosition: {
      type: Object as PropType<{ x: number; y: number }>,
      default: () => ({ x: 0, y: 0 }),
    },
    hasEditPerms: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { emit }) {
    const showRenameOption = () => {
      if (!props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.TREE;
    };

    const showViewOption = () => {
      if (props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.NODE;
    };

    const showEditOption = () => {
      if (!props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.NODE;
    };

    const showDeleteOption = () => {
      if (!props.hasEditPerms) return false;
      return (
        props.contextMenuType === ContextMenuType.NODE ||
        props.contextMenuType === ContextMenuType.PARTNER_REL ||
        props.contextMenuType === ContextMenuType.PARENT_REL ||
        props.contextMenuType === ContextMenuType.TREE
      );
    };

    const showAddNodeOption = () => {
      if (!props.hasEditPerms) return false;
      return props.contextMenuType === ContextMenuType.CANVAS;
    };

    const emitEvent = (eventType: ContextMenuEvent, event: MouseEvent) => {
      emit(eventType, event);
    };

    const hasMenuItems = computed(() => {
      return (
        showRenameOption() ||
        showEditOption() ||
        showDeleteOption() ||
        showAddNodeOption() ||
        showViewOption()
      );
    });

    return {
      showViewOption,
      showRenameOption,
      showEditOption,
      showDeleteOption,
      showAddNodeOption,
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
