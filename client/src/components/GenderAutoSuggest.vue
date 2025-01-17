<template>
  <div class="gender-suggest">
    <input
      v-model="inputValue"
      @input="handleInput"
      @keydown.enter="handleKeydown"
      @blur="clearSuggestions"
      type="text"
      placeholder="Enter gender"
    />
    <ul v-if="filteredSuggestions.length > 0" class="suggestions">
      <li
        v-for="(suggestion, index) in filteredSuggestions"
        :key="index"
        :class="{ active: index === activeIndex }"
        @mousedown="selectSuggestion(index)"
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";

export default defineComponent({
  name: "GenderAutoSuggest",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const suggestions = ["Male", "Female", "Non-Binary"];
    const inputValue = ref(props.modelValue);
    const filteredSuggestions = ref<string[]>([]);
    const activeIndex = ref(-1);

    const handleInput = () => {
      const value = inputValue.value.toLowerCase();
      if (value === "") {
        filteredSuggestions.value = [];
        return;
      }

      filteredSuggestions.value = suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(value) ||
            (value === "man" && s === "Male") ||
            (value === "woman" && s === "Female")
        )
        .sort((a, b) =>
          a.toLowerCase().startsWith(value)
            ? -1
            : b.toLowerCase().startsWith(value)
              ? 1
              : 0
        );
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        selectSuggestion();
      }
    };

    const selectSuggestion = (index?: number) => {
      const selected =
        typeof index === "number"
          ? filteredSuggestions.value[index]
          : filteredSuggestions.value[0];
      if (selected) {
        inputValue.value = selected;
        emit("update:modelValue", selected);
        filteredSuggestions.value = [];
      }
    };

    const clearSuggestions = () => {
      filteredSuggestions.value = [];
    };

    // Keep the input value in sync with the modelValue prop
    watch(
      () => props.modelValue,
      (newValue) => {
        inputValue.value = newValue;
      }
    );

    return {
      inputValue,
      filteredSuggestions,
      activeIndex,
      handleInput,
      selectSuggestion,
      clearSuggestions,
      handleKeydown,
    };
  },
});
</script>

<style scoped>
.gender-suggest {
  position: relative;
  display: inline-block;
}

input {
  width: 100%;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
}

.suggestions {
  position: absolute;
  width: 100%;
  border: 1px solid #ccc;
  background: #fff;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 100;
}

.suggestions li {
  padding: 8px;
  cursor: pointer;
}

.suggestions li.active,
.suggestions li:hover {
  background: #2e8b57;
  color: white;
}
</style>
