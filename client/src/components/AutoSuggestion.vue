/** * This component creates an input box that suggests possible connections
based on the user's input. The user can only select from available suggestions
to avoid creating invalid connections. */

<template lang="pug">
  // Input box that the user can type in
  li#item-input(
    :contentEditable="true",
    @input="filterSuggestions",
    @blur="cancel"
    @keydown.enter="selectSuggestion(activeIndex)"
    @keydown.tab="moveToNextSuggestion"
    @keydown.esc="cancel"
  )

  // Suggestion box appears below input and populates with filtered suggestions
  ul.suggestion-box(
    v-if="suggestions.length > 0"
  )
    li(
      v-for="suggestion, index in suggestions"
      :key="index"
      :class="{ active: index === activeIndex }"
      @mousedown="selectSuggestion(index)"
    ) {{ formatSuggestion(suggestion)}}
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, type PropType, type Ref } from "vue";
import { SuggestionType } from "@/helpers/sharedTypes";
import type { TreeMember } from "@/helpers/treeToNodes";

export default defineComponent({
  name: "AutoSuggestion",
  props: {
    // The ID of the originator of the connection
    originId: {
      type: String,
      required: true,
    },
    // The type of suggestion; can be "child", "parent", or "partner"
    suggestionType: {
      type: Number as PropType<number>,
      required: true,
    },
  },
  emits: ["close"],

  setup(props, { emit }) {
    // Initialize ref variables

    // Initial suggestions that should be displayed first
    const firstSuggestions: Ref<TreeMember[]> = ref([]);
    // Other options that can be displayed after the initial suggestions
    const otherSuggestions: Ref<TreeMember[]> = ref([]);
    // The combined list of suggestions
    const suggestions: Ref<TreeMember[]> = ref([]);
    // The index of the active suggestion
    const activeIndex = ref(-1);

    /*
    NAME
      selectSuggestion - Uses the selected index to connect the person

    SYNOPSIS
      (index: number) => Promise<void>
          index   --> the index of the selected suggestion

    DESCRIPTION
      This function is called when the user selects a suggestion from the
      suggestion box. It connects the selected person to the origin person
      based on the suggestion type.

    RETURNS
      A Promise<void> that resolves when the person is successfully connected.
    */
    const selectSuggestion = async (index: number) => {
      if (index === -1) return;

      // Get the selected suggestion
      const allSuggestions = firstSuggestions.value.concat(
        otherSuggestions.value
      );
      const selected = allSuggestions[index];

      // Determine which API endpoint to use based on the suggestion type
      let apiString = `api/connect/${props.originId}/${selected.id}`;
      if (props.suggestionType === SuggestionType.CHILD) {
        apiString += "/child";
      } else if (props.suggestionType === SuggestionType.PARENT) {
        apiString += "/parent";
      } else if (props.suggestionType === SuggestionType.PARTNER) {
        apiString += "/partner";
      }

      // Access the API
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Fetch response from the server
        const response = await fetch(apiString, {
          method: "POST",
          headers,
        });
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You do not have permission to edit this person.");
          } else {
            throw new Error("Failed to edit person");
          }
        }
        console.log("Successfully connected person");
        // Close the suggestion box
        emit("close", "success");
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        emit("close", error);
      }
    };
    /* selectSuggestion */

    /*
    NAME
      moveToNextSuggestion - Moves to the next suggestion in the list

    SYNOPSIS
      (event: Event) => void
          event   --> the event that triggered the function

    DESCRIPTION
      This function is called when the user presses the Tab key. It moves the
      active suggestion to the next one in the list. If the last suggestion is
      active, it loops back to the first suggestion.
    */
    const moveToNextSuggestion = (event: Event) => {
      // Prevent default tab behavior
      event.preventDefault();

      // Logic to move to the next suggestion
      if (activeIndex.value < suggestions.value.length - 1) {
        activeIndex.value++;
      } else {
        // Loop back to the first suggestion
        activeIndex.value = 0;
      }
    };
    /* moveToNextSuggestion */

    /*
    NAME
      formatSuggestion - Formats the suggestion for display
    
    SYNOPSIS
      (suggestion: TreeMember) => string
          suggestion   --> the suggestion to format

    DESCRIPTION
      This function takes a suggestion and formats it into a string that
      includes the person's name and date of birth (if available).
      
    RETURNS
      A string that represents the suggestion in a readable format.
    */
    const formatSuggestion = (suggestion: TreeMember) => {
      let sugString = "Unnamed Person";

      // Replace default suggestion string with person's name if it exists
      if (
        suggestion.firstName ||
        suggestion.lastName ||
        suggestion.middleName
      ) {
        sugString = `${suggestion.firstName ?? ""} ${suggestion.middleName ?? ""} ${suggestion.lastName ?? ""}`;
      }

      // Append the date of birth if it is given to differentiate between people with the same name
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
    /* formatSuggestion */

    /*
    NAME
      filterSuggestions - Filters the suggestions based on the input

    SYNOPSIS
      () => void

    DESCRIPTION
      This function filters the suggestions based on the user's input. It
      compares the input to the formatted suggestions and updates the list
      of suggestions accordingly.

    RETURNS
      void
    */
    const filterSuggestions = () => {
      // Filter suggestions based on the input
      const input = document.getElementById("item-input") as HTMLElement;
      if (!input) {
        return;
      }

      // Filter both lists separately to maintain order before combining them
      const filteredFirst = firstSuggestions.value.filter((suggestion) =>
        formatSuggestion(suggestion)
          .toLowerCase()
          .includes(input.innerText.toLowerCase())
      );
      const filteredOther = otherSuggestions.value.filter((suggestion) =>
        formatSuggestion(suggestion)
          .toLowerCase()
          .includes(input.innerText.toLowerCase())
      );
      suggestions.value = filteredFirst.concat(filteredOther);

      // Set the active index. If there are suggestions, set it to the first one
      if (suggestions.value.length) activeIndex.value = 0;
      // Otherwise, set it to -1 to indicate no active suggestion
      else activeIndex.value = -1;
    };
    /* filterSuggestions */

    /*
    NAME
      fetchSuggestions - Fetches suggestions from the server
    
    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function fetches suggestions from the server based on the originId
      and suggestionType. It populates the firstSuggestions and otherSuggestions
      lists with the fetched data.
    
    RETURNS
      A Promise<void> that resolves when the suggestions are successfully fetched.
    */
    const fetchSuggestions = async () => {
      // Fetch suggestions based on the originId and suggestionType
      let apiString = `api/suggestions/${props.originId}`;
      if (props.suggestionType === SuggestionType.CHILD) {
        apiString += "/children";
      } else if (props.suggestionType === SuggestionType.PARENT) {
        apiString += "/parents";
      } else if (props.suggestionType === SuggestionType.PARTNER) {
        apiString += "/partners";
      }

      // Fetch from the server
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Ensure response was ok
        const response = await fetch(apiString, {
          method: "GET",
          headers,
        });
        if (!response.ok) {
          console.log("message", (await response.json()).message);
          if (response.status === 403) {
            throw new Error("You do not have permission to view this person.");
          } else {
            throw new Error("Failed to fetch person");
          }
        }

        // Populate the suggestions lists with the fetched data
        const initialSuggestions = await response.json();
        firstSuggestions.value = initialSuggestions.firstSuggestions;
        otherSuggestions.value = initialSuggestions.otherSuggestions;
        filterSuggestions();
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        emit("close", error);
      }
    };
    /* fetchSuggestions */

    // Cancel the suggestion box and emit to the parent component
    const cancel = () => {
      emit("close", "cancel");
    };

    // Run when the component is mounted
    onMounted(() => {
      // Exit if clicked outside of the suggestion box
      document.addEventListener("click", (event) => {
        const suggestionBox = document.querySelector(".suggestion-box");
        if (suggestionBox && !suggestionBox.contains(event.target as Node)) {
          emit("close", "cancel");
        }
      });

      // Highlight the input box
      const input = document.getElementById("item-input") as HTMLElement;
      input.focus();

      // Fetch suggestions from the server
      fetchSuggestions();
    });

    return {
      suggestions,
      cancel,
      filterSuggestions,
      moveToNextSuggestion,
      activeIndex,
      selectSuggestion,
      formatSuggestion,
    };
  },
});
</script>

<style lang="stylus" scoped>
.suggestion-box
  position relative
  width 100%
  max-height 150px
  overflow-y auto
  background-color #ffffff
  border 1px solid #dee2e6
  border-radius 4px
  box-shadow 0 2px 4px rgba(0, 0, 0, 0.1)
  z-index 10
  padding 4px 0
  list-style none
  margin 4px 0 0

.suggestion-box li
  padding 8px 12px
  color #495057
  cursor pointer
  &:hover
    background-color #f1f3f5
    color #212529

.suggestion-box li.active
  background-color #e9ecef
  font-weight bold
</style>
