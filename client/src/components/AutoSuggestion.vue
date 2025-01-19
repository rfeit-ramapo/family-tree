<template lang="pug">
  li#item-input(
    :contentEditable="true",
    @input="filterSuggestions",
    @blur="cancel"
    @keydown.enter="selectSuggestion(activeIndex)"
    @keydown.tab="moveToNextSuggestion"
    @keydown.esc="cancel"
  )
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
    originId: {
      type: String,
      required: true,
    },
    suggestionType: {
      type: Number as PropType<number>,
      required: true,
    },
  },
  emits: ["close"],

  setup(props, { emit }) {
    const firstSuggestions: Ref<TreeMember[]> = ref([]);
    const otherSuggestions: Ref<TreeMember[]> = ref([]);
    const suggestions: Ref<TreeMember[]> = ref([]);
    const activeIndex = ref(-1);

    const selectSuggestion = async (index: number) => {
      if (index === -1) return;
      const allSuggestions = firstSuggestions.value.concat(
        otherSuggestions.value
      );
      const selected = allSuggestions[index];

      let apiString = `api/connect/${props.originId}/${selected.id}`;
      if (props.suggestionType === SuggestionType.CHILD) {
        apiString += "/child";
      } else if (props.suggestionType === SuggestionType.PARENT) {
        apiString += "/parent";
      } else if (props.suggestionType === SuggestionType.PARTNER) {
        apiString += "/partner";
      }

      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Fetch person data from server
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
        emit("close", "success");
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        emit("close", error);
      }
    };

    const moveToNextSuggestion = (event: Event) => {
      event.preventDefault(); // Prevent default Tab behavior

      // Logic to move to the next suggestion
      if (activeIndex.value < suggestions.value.length - 1) {
        activeIndex.value++;
      } else {
        activeIndex.value = 0; // Loop back to the first suggestion
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

    const filterSuggestions = () => {
      // Filter suggestions based on the input
      const input = document.getElementById("item-input") as HTMLElement;
      if (!input) {
        return;
      }

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
      if (suggestions.value.length) activeIndex.value = 0;
      else activeIndex.value = -1;
    };

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

      try {
        // Fetch suggestions
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Fetch person data from server
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
        const initialSuggestions = await response.json();
        firstSuggestions.value = initialSuggestions.firstSuggestions;
        otherSuggestions.value = initialSuggestions.otherSuggestions;
        filterSuggestions();
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        emit("close", error);
      }
    };

    const cancel = () => {
      // Cancel the suggestion box
      emit("close", "cancel");
    };

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
  position relative // Use relative positioning to remain in the flow
  width 100% // Match the width of the input
  max-height 150px
  overflow-y auto
  background-color #ffffff
  border 1px solid #dee2e6
  border-radius 4px
  box-shadow 0 2px 4px rgba(0, 0, 0, 0.1)
  z-index 10
  padding 4px 0
  list-style none
  margin 4px 0 0 // Add spacing from the input box

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
