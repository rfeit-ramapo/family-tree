/** This component shows an overlay and modal prompting the user to jump to
another location in the tree. The user can type in a name to filter the
suggestions, and select a suggestion to jump to that person. */

<template lang="pug">
  // Clicking outside the modal or hitting escape cancels the action
  div.overlay(@click.self="cancel")
  div.jump-to-person(
    @keydown.esc="cancel"
    tabindex="0"
  )
    // List item for typing in a name to filter suggestions
    li#item-input(
      :contentEditable="true",
      @input="filterSuggestions",
      @blur="cancel",
      @keydown.enter="selectSuggestion(activeIndex)",
      @keydown.tab="moveToNextSuggestion",
      @keydown.esc="cancel"
    )
    // List of suggestions to jump to
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
    // The ID of the tree to search for people in
    treeId: {
      type: String,
      required: true,
    },
  },
  emits: ["close", "select"],

  setup(props, { emit }) {
    // Reactive variables

    // List of suggestions to jump to
    const suggestions: Ref<TreeMember[]> = ref([]);
    // Index of the currently active suggestion
    const activeIndex = ref(-1);

    /*
    NAME
      fetchSuggestions - fetches suggestions for the displayed list

    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function fetches suggestions for the displayed list from the server
      and updates the suggestions and activeIndex variables.

    RETURNS
      A Promise<void> that resolves when the suggestions are fetched.
    */
    const fetchSuggestions = async () => {
      // Try to get suggestions from the server
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

        // Update the suggestions and activeIndex variables
        suggestions.value = await response.json();
        // If there are suggestions, set the active index to the first suggestion
        activeIndex.value = suggestions.value.length > 0 ? 0 : -1;
      } catch (error) {
        console.error(error);
        // Close the component on an error
        emit("close", error);
      }
    };

    /*
    NAME
      formatSuggestion - formats a suggestion for display

    SYNOPSIS
      (suggestion: TreeMember) => string
          suggestion   -->  the suggestion to format

    DESCRIPTION
      This function formats a suggestion for display in the suggestion list.
      It includes the person's name and date of birth if available.

    RETURNS
      A string representing the formatted suggestion.
    */
    const formatSuggestion = (suggestion: TreeMember) => {
      let sugString = "Unnamed Person";

      // Replace default string with the name if available
      if (
        suggestion.firstName ||
        suggestion.lastName ||
        suggestion.middleName
      ) {
        sugString = `${suggestion.firstName ?? ""} ${suggestion.middleName ?? ""} ${suggestion.lastName ?? ""}`;
      }

      // Add date of birth if available
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

    // Selects the suggestion at the given index and emits a select event
    const selectSuggestion = (index: number) => {
      if (index >= 0 && index < suggestions.value.length) {
        emit("select", suggestions.value[index]);
      }
    };

    // Filters the suggestions based on the input text
    const filterSuggestions = () => {
      const input = document.getElementById("item-input") as HTMLElement;
      const query = input?.innerText.toLowerCase() || "";
      suggestions.value = suggestions.value.filter((person) =>
        person.firstName?.toLowerCase().includes(query)
      );
      // Reset active index to the first suggestion (if available)
      activeIndex.value = suggestions.value.length ? 0 : -1;
    };

    // Canceling emits a close event to the parent component
    const cancel = () => {
      emit("close", "cancel");
    };

    // On mount, load the suggestions and focus the input field
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
