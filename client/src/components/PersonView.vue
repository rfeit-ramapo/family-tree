<template lang="pug">
  .overlay(@click.self="closeBox")

    .person-container(v-if="personDetails")
      button.close-button(@click="closeBox") x

      .success-message(v-if="showSuccessMessage")
        span Success! Entered user data has been saved.
      .error-message(v-if="errorMessage") {{ errorMessage }}

      .person-header 
        h2(v-if="firstName || middleName || lastName") {{firstName ?? ""}} {{ middleName ?? ""}} {{lastName ?? ""}}
        h2(v-else) Unnamed Person
      .person-image
        ImageUpload(
          :initial-image="imageUrl"
          :hasEditPerms="hasEditPerms"
          :person-id="personDetails.person.id"
          @update:image="updateImage"
          @error="errorMessage = 'There was an error uploading the image. Please try again later.'"
        )

      .person-data
        h3 Data

        .data-row
          span.data-label First Name: 
          span.data-value#firstName(
              :class="{unset: !firstName }"
              :contentEditable="hasEditPerms"
              @focus="textFocus"
              @blur="textBlur"
              @keydown.enter="enterField"
              @keydown.tab="tabField"
          ) {{ firstName ?? "Unset" }}

        .data-row
          span.data-label Middle Name: 
          span.data-value#middleName(
              :class="{unset: !middleName }"
              :contentEditable="hasEditPerms"
              @focus="textFocus"
              @blur="textBlur"
              @keydown.enter="enterField"
              @keydown.tab="tabField"
          ) {{ middleName ?? "Unset" }}

        .data-row
          span.data-label Last Name: 
          span.data-value#lastName(
              :class="{unset: !lastName }"
              :contentEditable="hasEditPerms"
              @focus="textFocus"
              @blur="textBlur"
              @keydown.enter="enterField"
              @keydown.tab="tabField"
          ) {{ lastName ?? "Unset" }}

        .data-row
          span.data-label Gender: 
          span.data-value#gender(
              :class="{unset: !gender }"
              :contentEditable="hasEditPerms"
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
              :contentEditable="hasEditPerms"
              @focus="textFocus"
              @blur="textBlur"
              @keydown.enter="enterField"
              @keydown.tab="tabField"
          ) {{ location ?? "Unset" }}

        .data-row
          span.data-label Date of Birth: 
          input.data-value#dateOfBirthInput(
            type="date"
            :disabled="!hasEditPerms"
            :value="formatDate(dateOfBirth)"
            @blur="updateDateOfBirth"
          )

        .data-row
          span.data-label Date of Death: 
          input.data-value#dateOfDeathInput(
            type="date"
            :disabled="!hasEditPerms"
            :value="formatDate(dateOfDeath)"
            @blur="updateDateOfDeath"
          )

      .edit-buttons(v-if="hasEditPerms")
        button.cancel-button(
          @click="fetchPerson"
        ) Cancel
        button.save-button(
          @click="savePerson"
        ) Save


      .connections
        h3 Connections

        .connection-row
          span
            .root-star(
              :class="{ active: isRoot }"
              @click="toggleRootStatus"
            )
              i(:class="`fa${isRoot ? 's' : 'r'} fa-star`")
            span.connection-label Relation to Root: 
            span.connection-value {{ personDetails.relationPath ?? "unrelated" }}

        .connection-row
          span.connection-label Partners:
          ul.connection-list
            li.connection-item(v-for="partner in personDetails.partners" :key="partner.id")
              button.delete-button(@click="removeConnection(partner.id)") -
              i.partner-star(
                :class="`fa${partner.id === personDetails.currentPartner?.id ? 's' : 'r'} fa-star`"
                @click="toggleCurrentPartner(partner.id)"
              )
              span {{ computeName(partner) }}
            AutoSuggestion(
              v-if="showAddPartner && hasEditPerms"
              :originId="personDetails.person.id"
              :suggestionType="SuggestionType.PARTNER"
              @close="reloadPerson"
            )
          button.add-connection-btn(@click="showAddPartner = true") +

        .connection-row
          span.connection-label(v-if="personDetails.currentPartner"
          ) Current Partner: 
            span.connection-value {{ computeName(personDetails.currentPartner) }}

        .connection-row
          span.connection-label Parents: 
          ul.connection-list
            li.connection-item(
              v-for="parent in personDetails.parents"
            ) 
              button.delete-button(@click="removeConnection(parent.id)") -
              span {{ computeName(parent) }}
            AutoSuggestion(
              v-if="showAddParent && personDetails.parents.length < 2 && hasEditPerms"
              :originId="personDetails.person.id"
              :suggestionType="SuggestionType.PARENT"
              @close="reloadPerson"
            )
          button.add-connection-btn(
            v-if="personDetails.parents.length < 2"
            @click="showAddParent = true"
          ) +

        .connection-row
          span.connection-label Children: 
          ul.connection-list
            li.connection-item(
              v-for="child in personDetails.children"
            ) 
              button.delete-button(@click="removeConnection(child.id)") -
              span {{ computeName(child) }}
            AutoSuggestion(
              v-if="showAddChild && hasEditPerms"
              :originId="personDetails.person.id"
              :suggestionType="SuggestionType.CHILD"
              @close="reloadPerson"
            )
          button.add-connection-btn(@click="showAddChild = true") +


      
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, type Ref } from "vue";
import { type PersonDetails, type TreeMember } from "@/helpers/treeToNodes";

import ImageUpload from "./ImageUpload.vue";
import AutoSuggestion from "./AutoSuggestion.vue";
import { SuggestionType } from "@/helpers/sharedTypes";

export default defineComponent({
  name: "PersonView",
  props: {
    personId: {
      type: String,
      required: true,
    },
  },
  components: {
    ImageUpload,
    AutoSuggestion,
  },
  emits: ["changeName", "changePicture", "reloadTree", "close"],
  setup(props, { emit }) {
    const personDetails: Ref<PersonDetails | null> = ref(null);
    const hasEditPerms = ref(false);
    const errorMessage: Ref<string | null> = ref(null);
    const genderSuggestions = ref<string[]>([]);
    const activeGenderIndex = ref(-1);
    const showSuccessMessage = ref(false);
    const showAddChild = ref(false);
    const showAddParent = ref(false);
    const showAddPartner = ref(false);
    const blurredOnKey = ref(false);

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
        const response = await fetch(`/api/person/${props.personId}`, {
          headers,
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You do not have permission to view this person.");
          } else {
            throw new Error("Failed to fetch person");
          }
        }

        personDetails.value = await response.json();
        console.log(
          "person details:",
          JSON.stringify(personDetails.value, null, 2)
        );
        const userId = localStorage.getItem("userId");

        hasEditPerms.value =
          userId && personDetails.value
            ? personDetails.value.editors.includes(userId) ||
              personDetails.value.creator === userId
            : false;
        if (personDetails.value) {
          updateDateOfBirth({
            target: {
              value: formatDate(personDetails.value.person.dateOfBirth),
            },
          } as unknown as Event);
          updateDateOfDeath({
            target: {
              value: formatDate(personDetails.value.person.dateOfDeath),
            },
          } as unknown as Event);
        }
        console.log("fetchedPerson");
      } catch (error) {
        console.error("Error fetching person data", error);
        errorMessage.value =
          "There was an error fetching the person data. Please try again later.";
        personDetails.value = null;
      }
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

    // Date handling functions
    const formatDate = (date: any): string => {
      if (!date) return "";

      // If it's already a string in YYYY-MM-DD format, return it
      if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date;
      }

      // Handle both Date objects and the detailed structure from the backend
      const dateObj =
        date instanceof Date
          ? date
          : new Date(
              date.year,
              date.month - 1, // Convert 1-based month to 0-based for JS Date
              date.day
            );

      if (isNaN(dateObj.getTime())) return "";

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const updateDateOfBirth = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (personDetails.value) {
        // Create date at noon UTC to avoid timezone issues
        personDetails.value.person.dateOfBirth = input.value
          ? new Date(input.value + "T12:00:00Z")
          : undefined;
      }
    };

    const updateDateOfDeath = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (personDetails.value) {
        // Create date at noon UTC to avoid timezone issues
        personDetails.value.person.dateOfDeath = input.value
          ? new Date(input.value + "T12:00:00Z")
          : undefined;
      }
    };

    const validateDates = (): boolean => {
      if (!personDetails.value) return true;

      const birth = personDetails.value.person.dateOfBirth;
      const death = personDetails.value.person.dateOfDeath;

      if (!birth || !death) return true;

      const birthDate = new Date(birth);
      const deathDate = new Date(death);

      return (
        !isNaN(birthDate.getTime()) &&
        !isNaN(deathDate.getTime()) &&
        birthDate <= deathDate
      );
    };

    const updateImage = (newImageUrl: string) => {
      if (personDetails.value) {
        personDetails.value.person.imageUrl = newImageUrl;
      }
      emit("changePicture", newImageUrl);
    };

    const toggleRootStatus = async () => {
      if (!hasEditPerms.value) return;
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const isRoot = !personDetails.value?.isRoot;

        const response = await fetch(`/api/person/${props.personId}/root`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ isRoot }),
        });

        if (!response.ok) {
          throw new Error("Failed to update root status");
        } else {
          personDetails.value!.isRoot = isRoot;
          fetchPerson();
        }
      } catch (error) {
        console.error("Error updating root status", error);
        errorMessage.value =
          "There was an error updating the root status. Please try again later.";
      }
    };

    const toggleCurrentPartner = async (partnerId: string) => {
      if (!hasEditPerms.value) return;
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
          `/api/connection/toggle-current-partner/${props.personId}/${partnerId}`,
          {
            headers,
            method: "POST",
          }
        );

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You do not have permission to edit this person.");
          } else {
            throw new Error("Failed to edit person");
          }
        }

        await response.json();
        fetchPerson();
        emit("reloadTree");
      } catch (error) {
        console.error("Error updating person", error);
      }
    };

    const textFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains("unset")) {
        target.innerText = "";
      } else {
        // Highlight inner text
        const range = document.createRange();
        const selection = window.getSelection();

        if (selection && target.firstChild) {
          range.selectNodeContents(target);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    };

    const textBlur = (event: Event) => {
      if (blurredOnKey.value) {
        blurredOnKey.value = false;
        return;
      }
      genderSuggestions.value = [];
      const target = event.target as HTMLElement;
      const key = target.id as (typeof typeableFields)[number];

      if (target.innerText !== "") {
        (personDetails.value!.person[key as keyof TreeMember] as string) =
          target.innerText;
        target.classList.remove("unset");
      } else if (!personDetails.value!.person[key as keyof TreeMember]) {
        target.innerText = "Unset";
        target.classList.add("unset");
      }

      // Deselect text
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    };

    const enterGenderField = (event: KeyboardEvent) => {
      selectGenderSuggestion();
      genderSuggestions.value = [];
      enterField(event);
    };

    const enterField = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      target.blur();
    };

    const tabField = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const key = target.id as (typeof typeableFields)[number];

      if (target.id === "gender") {
        enterGenderField(event);
      } else {
        genderSuggestions.value = [];

        console.log("in tab field");

        if (target.innerText !== "") {
          console.log("target inner text", target.innerText);
          (personDetails.value!.person[key as keyof TreeMember] as string) =
            target.innerText;
          target.classList.remove("unset");
        } else if (!personDetails.value!.person[key as keyof TreeMember]) {
          target.innerText = "Unset";
          target.classList.add("unset");
        }
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
      blurredOnKey.value = true;
    };

    const savePerson = async () => {
      try {
        if (!validateDates()) {
          errorMessage.value = "Date of death cannot be before date of birth";
          return;
        }

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/person/${props.personId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(personDetails.value),
        });

        if (!response.ok) {
          throw new Error("Failed to save person");
        }

        await fetchPerson();
        showSuccessMessage.value = true;
        setTimeout(() => {
          showSuccessMessage.value = false;
        }, 3000);

        emit("changeName", {
          firstName: firstName.value,
          middleName: middleName.value,
          lastName: lastName.value,
        });
      } catch (error) {
        console.error("Error saving person data", error);
        errorMessage.value =
          "There was an error saving the person data. Please try again later.";
      }
    };

    const removeConnection = async (relatedId: string) => {
      if (!hasEditPerms.value) return;
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/connection/remove/${props.personId}/${relatedId}`,
          {
            method: "POST",
            headers,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to remove connection");
        }

        await fetchPerson();
        emit("reloadTree");
      } catch (error) {
        console.error("Error removing connection", error);
        errorMessage.value =
          "There was an error removing the connection. Please try again later.";
      }
    };

    const reloadPerson = async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      await delay(100);
      showAddChild.value = false;
      showAddParent.value = false;
      showAddPartner.value = false;
      await fetchPerson();
      emit("reloadTree");
    };

    const closeBox = () => {
      emit("close");
    };

    const computeName = (person: TreeMember) => {
      if (person.firstName || person.middleName || person.lastName) {
        return `${person.firstName ?? ""} ${person.middleName ?? ""} ${
          person.lastName ?? ""
        }`;
      }
      return `Unnamed Person`;
    };

    // Computed properties
    const firstName = computed(() => personDetails.value?.person.firstName);
    const middleName = computed(() => personDetails.value?.person.middleName);
    const lastName = computed(() => personDetails.value?.person.lastName);
    const gender = computed(() => personDetails.value?.person.gender);
    const location = computed(() => personDetails.value?.person.location);
    const dateOfBirth = computed(() => personDetails.value?.person.dateOfBirth);
    const dateOfDeath = computed(() => personDetails.value?.person.dateOfDeath);
    const imageUrl = computed(() => personDetails.value?.person.imageUrl);
    const isRoot = computed(() => personDetails.value?.isRoot);

    const fullName = computed(() => {
      return computeName(personDetails.value!.person);
    });

    onMounted(async () => {
      await fetchPerson();
    });

    return {
      showAddChild,
      showAddParent,
      showAddPartner,
      reloadPerson,
      SuggestionType,
      computeName,
      closeBox,
      fetchPerson,
      savePerson,
      hasEditPerms,
      errorMessage,
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
      isRoot,
      toggleRootStatus,
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
      showSuccessMessage,
      toggleCurrentPartner,
      removeConnection,
    };
  },
});
</script>

<style lang="stylus" scoped>
.person-container
  position relative
  max-width 90%
  max-height 90%
  overflow-y auto
  background-color #f8f9fa
  padding 16px
  border-radius 8px
  box-shadow 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)
  margin-bottom 16px
  width 50%
  z-index 1010

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

.edit-buttons
  display flex
  justify-content space-evenly
  margin-top 16px
  button
    min-width 125px
    padding 8px 16px
    border-radius 4px
    margin-left 8px
    cursor pointer
    &.cancel-button
      background-color #f8d7da
      color #721c24
      border 1px solid #721c24
    &.save-button
      background-color #d4edda
      color #155724
      border 1px solid #155724
    &:hover
      background-color #f8f9fa

.success-message
  background-color #d4edda // Light green background
  color #155724 // Dark green text
  border 1px solid #c3e6cb // Green border
  padding 10px
  margin 10px 0
  border-radius 4px
  text-align center

.root-star
  display inline-block
  margin-right 5px
  cursor pointer
  color lightgray
  transition color 0.3s ease
  &.active
    color yellow
  &:hover
    color darken(yellow, 15%)

.overlay
  position fixed
  top 0
  left 0
  width 100vw
  height 100vh
  background rgba(0, 0, 0, 0.5)
  z-index 1010
  display flex
  justify-content center
  align-items center

.close-button
  position absolute
  top 8px
  right 8px
  width 24px
  height 24px
  background transparent
  border none
  font-size 18px
  font-weight bold
  cursor pointer
  color #333

  &:hover
    color #000

.add-connection-btn
  background-color transparent
  border none
  color green
  font-size 1.5em
  cursor pointer
  padding 0
  margin 0
  display inline-flex
  align-items center
  justify-content left
  max-width 15px
  &:hover
    color darkgreen
  &:focus
    outline none

.partner-star
  display inline-block
  margin-right 8px
  cursor pointer
  color lightgray
  transition color 0.3s ease
  &.active
    color yellow
  &:hover
    color darken(yellow, 15%)

.delete-button
  background-color transparent
  border none
  color red
  font-size 1.5em
  cursor pointer
  padding 0
  margin 0
  margin-right 8px
  display inline-flex
  align-items center
  justify-content left
  max-width 15px
  &:hover
    color darkred
  &:focus
    outline none
</style>
