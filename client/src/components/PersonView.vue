<template lang="pug">
  .person-container(v-if="personDetails")
    .person-header 
      h2(v-if="firstName || middleName || lastName") {{firstName ?? ""}} {{ middleName ?? ""}} {{lastName ?? ""}}
      h2(v-else) Unnamed Person
    .person-image
      ImageUpload(
        :initial-image="imageUrl"
        :person-id="personDetails.person.id"
        @update:image="updateImage"
      )
    .person-data
      h3 Data
      .data-row
        span.data-label First Name: 
        span.data-value#firstName(
            :class="{unset: !firstName }"
            :contentEditable="true"
            @focus="textFocus"
            @blur="textBlur"
            @keydown.enter="enterField"
            @keydown.tab="tabField"
        ) {{ firstName ?? "Unset" }}
      .data-row
        span.data-label Middle Name: 
        span.data-value#middleName(
            :class="{unset: !middleName }"
            :contentEditable="true"
            @focus="textFocus"
            @blur="textBlur"
            @keydown.enter="enterField"
            @keydown.tab="tabField"
        ) {{ middleName ?? "Unset" }}
      .data-row
        span.data-label Last Name: 
        span.data-value#lastName(
            :class="{unset: !lastName }"
            :contentEditable="true"
            @focus="textFocus"
            @blur="textBlur"
            @keydown.enter="enterField"
            @keydown.tab="tabField"
        ) {{ lastName ?? "Unset" }}
      .data-row
        span.data-label Gender: 
        span.data-value#gender(
            :class="{unset: !gender }"
            :contentEditable="true"
            @focus="textFocus"
            @blur="textBlur"
            @input="updateGenderSuggestions"
            @keydown.enter="enterGenderField"
            @keydown.tab="tabField"
        ) {{ gender ?? "Unset"}}
        ul.gender-suggestion-box(
            v-if="genderSuggestions.length > 0"
        )
          li(
            v-for="suggestion, index in genderSuggestions"
            :key="index"
            :class="{ active: index === activeGenderIndex }"
            @mousedown="selectGenderSuggestion(index)"
          ) {{ suggestion }}
      .data-row
        span.data-label Location: 
        span.data-value#location(
            :class="{unset: !location }"
            :contentEditable="true"
            @focus="textFocus"
            @blur="textBlur"
            @keydown.enter="enterField"
            @keydown.tab="tabField"
        ) {{ location ?? "Unset" }}
      .data-row
        span.data-label Date of Birth: 
        input.data-value#dateOfBirthInput(
          type="date"
          :value="formatDate(dateOfBirth)"
          @input="updateDateOfBirth"
        )
      .data-row
        span.data-label Date of Death: 
        input.data-value#dateOfDeathInput(
          type="date"
          :value="formatDate(dateOfDeath)"
          @input="updateDateOfDeath"
        )

    .connections
      h3 Connections
      .connection-row
        span.connection-label Relation to Root: 
        span.connection-value {{ rootId ? personDetails.relationPath : "no root set" }}
      .connection-row(v-if="personDetails.parents.length > 0")
        span.connection-label Partners: 
        ul.connection-list
          li.connection-item(v-for="partner in personDetails.partners") {{ partner }}
      .connection-row(v-if="personDetails.currentPartner")
        span.connection-label Current Partner: 
        span.connection-value {{ personDetails.currentPartner }}
      .connection-row(v-if="personDetails.parents.length > 0")
        span.connection-label Parents: 
        ul.connection-list
          li.connection-item(v-for="parent in personDetails.parents") {{ parent }}
      .connection-row(v-if="personDetails.children.length > 0")
        span.connection-label Children: 
        ul.connection-list
          li.connection-item(v-for="child in personDetails.children") {{ child }}


      
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, type Ref } from "vue";
import { type PersonDetails, type TreeMember } from "@/helpers/treeToNodes";
import GenderAutoSuggest from "./GenderAutoSuggest.vue";
import ImageUpload from "./ImageUpload.vue";

export default defineComponent({
  name: "PersonView",
  props: {
    personId: {
      type: String,
      required: true,
    },
    rootId: {
      type: String,
    },
  },
  components: {
    GenderAutoSuggest,
    ImageUpload,
  },
  setup(props) {
    const personDetails: Ref<PersonDetails | null> = ref(null);
    const hasEditPerms = ref(false);
    const errorMessage: Ref<string | null> = ref(null);
    const genderSuggestions = ref<string[]>([]);
    const activeGenderIndex = ref(-1);

    const typeableFields: readonly string[] = [
      "firstName",
      "middleName",
      "lastName",
      "gender",
      "location",
    ];

    const fetchPerson = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Fetch person data from server
        const response = await fetch(
          `/api/person/${props.personId}?rootId=${props.rootId}`,
          {
            headers,
          }
        );

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You do not have permission to view this person.");
          } else {
            throw new Error("Failed to fetch person");
          }
        }

        personDetails.value = await response.json();
        const userId = localStorage.getItem("userId");

        hasEditPerms.value =
          userId && personDetails.value
            ? personDetails.value.editors.includes(userId)
            : false;

        console.log(
          "Person data",
          JSON.stringify(personDetails.value, null, 2)
        );
      } catch (error) {
        console.error("Error fetching person data", error);
        errorMessage.value =
          "There was an error fetching the person data. Please try again later.";
        personDetails.value = null;
      }
    };

    const formatDate = (date: Date | null) => {
      if (!date) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const selectGenderSuggestion = (index?: number) => {
      const selected =
        typeof index === "number"
          ? genderSuggestions.value[index]
          : genderSuggestions.value[0];

      if (selected) {
        document.getElementById("gender")!.innerText = selected;
        genderSuggestions.value = [];
      }
    };

    const updateGenderSuggestions = (event: InputEvent) => {
      const suggestions = ["Male", "Female", "Non-Binary"];
      const value = (event.target as HTMLElement).innerText.toLowerCase();

      genderSuggestions.value = suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(value) ||
            ("man".includes(value) && s === "Male") ||
            ("woman".includes(value) && s === "Female")
        )
        .sort((a, b) =>
          a.toLowerCase().startsWith(value)
            ? -1
            : b.toLowerCase().startsWith(value)
              ? 1
              : 0
        );
    };

    const updateDateOfBirth = (event: InputEvent) => {
      const input = event.target as HTMLInputElement;
      const newDate = input.value ? new Date(input.value) : undefined;
      if (personDetails.value) {
        personDetails.value.person.dateOfBirth = newDate;
      }
    };

    const updateDateOfDeath = (event: InputEvent) => {
      const input = event.target as HTMLInputElement;
      const newDate = input.value ? new Date(input.value) : undefined;
      if (personDetails.value) {
        personDetails.value.person.dateOfDeath = newDate;
      }
    };

    const updateImage = (newImageUrl: string) => {
      if (personDetails.value) {
        personDetails.value.person.imageUrl = newImageUrl;
      }
    };

    const textFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      target.innerText = "";
      target.classList.remove("unset");
    };

    const textBlur = (event: FocusEvent) => {
      genderSuggestions.value = [];
      const target = event.target as HTMLElement;
      if (target.innerText && personDetails.value) {
        const key = target.id as (typeof typeableFields)[number];
        if (typeableFields.includes(key)) {
          (personDetails.value.person[key as keyof TreeMember] as string) =
            target.innerText;
        }
      } else {
        target.innerText = "Unset";
        target.classList.add("unset");
      }
    };

    const enterGenderField = (event: KeyboardEvent) => {
      selectGenderSuggestion();
      enterField(event);
    };

    const enterField = (event: KeyboardEvent) => {
      // Unfocus the field
      const target = event.target as HTMLElement;
      target.blur();
    };

    const tabField = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).id === "gender") {
        enterGenderField(event);
      } else {
        enterField(event);
      }

      // Move to the next field, if there is one
      const nextFieldIndex =
        typeableFields.indexOf((event.target as HTMLElement).id) + 1;
      if (nextFieldIndex < typeableFields.length) {
        const nextField = document.getElementById(
          typeableFields[nextFieldIndex]
        );
        if (nextField) {
          nextField.focus();
          event.preventDefault();
        }
      }
    };

    const firstName = computed(() => personDetails.value?.person.firstName);
    const middleName = computed(() => personDetails.value?.person.middleName);
    const lastName = computed(() => personDetails.value?.person.lastName);
    const gender = computed(() => personDetails.value?.person.gender);
    const location = computed(() => personDetails.value?.person.location);
    const dateOfBirth = computed(() => personDetails.value?.person.dateOfBirth);
    const dateOfDeath = computed(() => personDetails.value?.person.dateOfDeath);
    const imageUrl = computed(() => personDetails.value?.person.imageUrl);

    const fullName = computed(() => {
      if (firstName.value || middleName.value || lastName.value) {
        return `${firstName.value ?? ""} ${middleName.value ?? ""} ${lastName.value ?? ""}`;
      }
      return `Unnamed Person`;
    });

    onMounted(async () => {
      await fetchPerson();
    });

    return {
      personDetails,
      firstName,
      middleName,
      lastName,
      gender,
      location,
      dateOfBirth,
      dateOfDeath,
      imageUrl,
      fullName,
      textFocus,
      textBlur,
      enterField,
      enterGenderField,
      tabField,
      genderSuggestions,
      activeGenderIndex,
      selectGenderSuggestion,
      updateGenderSuggestions,
      formatDate,
      updateDateOfBirth,
      updateDateOfDeath,
      updateImage,
    };
  },
});
</script>

<style lang="stylus" scoped>
.person-container
  background-color #f8f9fa
  padding 24px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  margin-bottom 16px
  width 50%

.person-header
  text-align center
  margin-bottom 24px
  h2
    font-size 2em
    color #495057
    margin 0

.person-image
  text-align center
  margin-bottom 24px
  img
    border-radius 8px
    max-width 100%
    max-height 200px
    box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)

.person-data
  h3
    font-size 1.5em
    color #343a40
    margin-bottom 16px
  .data-row
    display flex
    justify-content space-between
    padding 8px 0
    border-bottom 1px solid #dee2e6
    &:last-child
      border-bottom none
    span.data-label
      font-weight bold
      color #495057
    span.data-value
      color #6c757d

.connections
  margin-top 25px
  margin-bottom 24px
  h3
    font-size 1.5em
    color #343a40
    margin-bottom 16px
  .connection-row
    display flex
    flex-direction column
    margin-bottom 16px
    span.connection-label
      font-weight bold
      color #495057
    span.connection-value
      color #6c757d
    ul.connection-list
      list-style-type none
      padding-left 0
      li.connection-item
        padding 4px 0
        color #6c757d
        &:hover
          color #2e8b57
          cursor pointer

.error-message
  background-color #f8d7da
  color #721c24
  padding 16px
  border-radius 8px
  box-shadow 0 4px 8px rgba(0, 0, 0, 0.1)
  text-align center

.data-row
  position relative
  display flex
  align-items center
  justify-content space-between
  background-color #f9f9f9
  padding 8px
  border-bottom 1px solid #dee2e6
  &:last-child
    border-bottom none

  input[type="date"]
    padding 6px
    border 1px solid #ccc
    border-radius 4px
    background-color #fff
    cursor pointer
    appearance none

  input[type="date"]:hover
    background-color #f9f9f9
    border-color #2e8b57

  input[type="date"]:focus
    border-color #2e8b57
    background-color #fff
    box-shadow 0 0 5px rgba(46, 139, 87, 0.5)


.data-label
  border-radius 8px
  font-weight bold
  margin-right 8px
  color #333

.data-value
  flex 1
  text-align left
  padding 6px
  border-radius 4px
  outline none
  cursor pointer
  &:hover
    outline 2px #2e8b57
    background-color #f0f0f0
  &:focus
    outline 2px solid #2e8b57
    background-color white

  &.unset
    font-style italic
    color #aaa

.gender-suggestion-box
  position absolute
  top calc(100% + 4px) // Slight space below the editable field
  left 0
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
  margin 0

.gender-suggestion-box li
  padding 8px 12px
  color #495057
  cursor pointer
  &:hover
    background-color #f1f3f5
    color #212529

.gender-suggestion-box li.active
  background-color #e9ecef
  font-weight bold
</style>
