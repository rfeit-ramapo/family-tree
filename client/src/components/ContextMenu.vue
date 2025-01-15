<template lang="pug">

.tree-context-menu(
  v-if="contextMenuVisible" 
  :style="{ top: `${contextMenuPosition.y}px`, left: `${contextMenuPosition.x}px`, position: 'absolute' }"
  )
  ul.context-menu-list
    li.context-menu-item(v-if="showRenameOption()" @click="emitEvent(ContextMenuEvent.RENAME)") Rename
    li.context-menu-item(v-if="showEditOption()" @click="emitEvent(ContextMenuEvent.EDIT)") Edit
    li.context-menu-item(v-if="showDeleteOption()" @click="emitEvent(ContextMenuEvent.DELETE)") Delete
    li.context-menu-item(v-if="showAddNodeOption()" @click="emitEvent(ContextMenuEvent.ADD_NODE)") Create Node
    li.context-menu-item(v-if="showConnectOption()" @click="emitEvent(ContextMenuEvent.CONNECT)") Connect
</template>

<script lang="ts">
import { defineComponent, ref, type PropType } from "vue";
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
  },
  setup(props, { emit }) {
    const showRenameOption = () => {
      return props.contextMenuType === ContextMenuType.TREE;
    };

    const showEditOption = () => {
      return (
        props.contextMenuType === ContextMenuType.NODE ||
        props.contextMenuType === ContextMenuType.RELATIONSHIP
      );
    };

    const showDeleteOption = () => {
      return (
        props.contextMenuType === ContextMenuType.NODE ||
        props.contextMenuType === ContextMenuType.RELATIONSHIP ||
        props.contextMenuType === ContextMenuType.TREE
      );
    };

    const showAddNodeOption = () => {
      return props.contextMenuType === ContextMenuType.CANVAS;
    };

    const showConnectOption = () => {
      return props.contextMenuType === ContextMenuType.NODE;
    };

    const emitEvent = (eventType: ContextMenuEvent) => {
      emit(eventType);
    };

    return {
      showRenameOption,
      showEditOption,
      showDeleteOption,
      showAddNodeOption,
      showConnectOption,
      emitEvent,
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
