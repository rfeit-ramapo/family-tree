<template lang="pug">
  div.overlay(@click.self="cancel")
  div.jump-to-person(
    @keydown.esc="cancel"
    tabindex="0"
  )
    li#item-input(
      :contentEditable="true",
      @input="filterSuggestions",
      @blur="cancel",
      @keydown.enter="selectSuggestion(activeIndex)",
      @keydown.tab="moveToNextSuggestion",
      @keydown.esc="cancel"
    )
    ul.suggestion-box(
     v-if="suggestions.length > 0"
    )
      li(
        v-for="(suggestion, index) in suggestions"
        :key="index"
        :class="{ active: index === activeIndex }"
        @mousedown="selectSuggestion(index)"
    ) {{ formatSuggestion(suggestion) }}
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, type Ref } from "vue";
import type { TreeMember } from "@/helpers/treeToNodes";

export default defineComponent({
  name: "JumpToPerson",
  props: {
    treeId: {
      type: String,
      required: true,
    },
  },
  emits: ["close", "select"],

  setup(props, { emit }) {
    const suggestions: Ref<TreeMember[]> = ref([]);
    const activeIndex = ref(-1);

    const fetchSuggestions = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        };
        const response = await fetch(`/api/tree/get-people/${props.treeId}`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        suggestions.value = await response.json();
        activeIndex.value = suggestions.value.length > 0 ? 0 : -1;
      } catch (error) {
        console.error(error);
        emit("close", error);
      }
    };

    const formatSuggestion = (suggestion: TreeMember) => {
      let sugString = "Unnamed Person";
      if (
        suggestion.firstName ||
        suggestion.lastName ||
        suggestion.middleName
      ) {
        sugString = `${suggestion.firstName ?? ""} ${suggestion.middleName ?? ""} ${suggestion.lastName ?? ""}`;
      }
      if (suggestion.dateOfBirth) {
        const year = (suggestion.dateOfBirth as any).year;
        const month = String((suggestion.dateOfBirth as any).month).padStart(
          2,
          "0"
        );
        const day = String((suggestion.dateOfBirth as any).day).padStart(
          2,
          "0"
        );
        sugString += ` [DOB: ${year}/${month}/${day}]`;
      }
      return sugString;
    };

    const selectSuggestion = (index: number) => {
      if (index >= 0 && index < suggestions.value.length) {
        emit("select", suggestions.value[index]);
      }
    };

    const filterSuggestions = () => {
      const input = document.getElementById("item-input") as HTMLElement;
      const query = input?.innerText.toLowerCase() || "";
      suggestions.value = suggestions.value.filter((person) =>
        person.firstName?.toLowerCase().includes(query)
      );
      activeIndex.value = suggestions.value.length ? 0 : -1;
    };

    const cancel = () => {
      emit("close", "cancel");
    };

    onMounted(() => {
      fetchSuggestions();
      const input = document.getElementById("item-input");
      input?.focus();
    });

    return {
      suggestions,
      activeIndex,
      filterSuggestions,
      selectSuggestion,
      cancel,
      formatSuggestion,
    };
  },
});
</script>

<style lang="stylus" scoped>
.overlay
  position fixed
  top 0
  left 0
  width 100vw
  height 100vh
  background-color rgba(0, 0, 0, 0.5)
  z-index 1050

.jump-to-person
  position fixed
  top 10%
  left 10%
  width 80%
  background-color #ffffff
  border-radius 8px
  box-shadow 0 4px 6px rgba(0, 0, 0, 0.2)
  padding 16px
  z-index 1051
  outline none

.suggestion-box
  position relative
  max-height 200px
  overflow-y auto
  background-color #ffffff
  border 1px solid #dee2e6
  border-radius 4px
  box-shadow 0 2px 4px rgba(0, 0, 0, 0.1)
  list-style none
  margin 4px 0
  padding 0

.suggestion-box li
  padding 8px 12px
  cursor pointer
  &:hover, &.active
    background-color #e9ecef
    font-weight bold
</style>
