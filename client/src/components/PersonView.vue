/** Component that holds the specific details of a person in the tree. This
includes their name, image, and connections to other people in the tree. The
component also allows for editing of the person's details, including their
image, other data, and connections. */

<template lang="pug">
  // Clicking outside the person container closes the box
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
    // The ID of the person to display
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
    // Reactive variables

    // The details of the person to display
    const personDetails: Ref<PersonDetails | null> = ref(null);
    // Whether the current user has edit permissions for the person
    const hasEditPerms = ref(false);
    // Error message to display to the user, if any
    const errorMessage: Ref<string | null> = ref(null);
    // Suggestions to show for the person's gender
    const genderSuggestions = ref<string[]>([]);
    // Index of the currently active gender suggestion
    const activeGenderIndex = ref(-1);
    // Whether to show a success message
    const showSuccessMessage = ref(false);
    // Whether to show the add child suggestion box
    const showAddChild = ref(false);
    // Whether to show the add parent suggestion box
    const showAddParent = ref(false);
    // Whether to show the add partner suggestion box
    const showAddPartner = ref(false);
    // Whether the editable field was blurred due to a key event
    const blurredOnKey = ref(false);
    // A list of fields that can be edited
    const typeableFields: readonly string[] = [
      "firstName",
      "middleName",
      "lastName",
      "gender",
      "location",
    ];

    /*
    NAME
      fetchPerson - fetches the details of the person to display
    
    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function fetches the details of the person to display from the server
      and updates the personDetails and hasEditPerms variables.

    RETURNS
      A Promise that resolves when the person details have been fetched
    */
    const fetchPerson = async () => {
      // Request the person's details from the server
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
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

        // Update the person details
        personDetails.value = await response.json();

        // Determine if the current user has edit permissions
        const userId = localStorage.getItem("userId");
        hasEditPerms.value =
          userId && personDetails.value
            ? personDetails.value.editors.includes(userId) ||
              personDetails.value.creator === userId
            : false;

        // Make date of birth conform to input requirements
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
      } catch (error) {
        console.error("Error fetching person data", error);
        errorMessage.value =
          "There was an error fetching the person data. Please try again later.";
        personDetails.value = null;
      }
    };
    /* fetchPerson */

    // Sets the inner text of the gender field to the selected suggestion
    const selectGenderSuggestion = (index?: number) => {
      const selected = index
        ? genderSuggestions.value[index]
        : genderSuggestions.value[0];

      if (selected) {
        document.getElementById("gender")!.innerText = selected;
        genderSuggestions.value = [];
      }
    };

    /*
    NAME
      updateGenderSuggestions - updates the gender suggestions based on user input
    
    SYNOPSIS
      (event: InputEvent) => void
          event   -->  the input event that triggered the update

    DESCRIPTION
      This function updates the suggested genders based on what the user has
      typed into the input field.

    RETURNS
      void
    */
    const updateGenderSuggestions = (event: InputEvent) => {
      const suggestions = ["Male", "Female", "Non-Binary"];
      const value = (event.target as HTMLElement).innerText.toLowerCase();

      genderSuggestions.value = suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(value) ||
            // Also account for typing 'man' or 'woman'
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

    /*
    NAME
      formatDate - formats a date object or string to a YYYY-MM-DD string

    SYNOPSIS
      (date: Date | string | { year: number, month: number, day: number }) => string
          date   -->  the date to format

    DESCRIPTION
      This function formats a date object or string to a string in the format
      YYYY-MM-DD. It handles Date objects, strings in YYYY-MM-DD format
      already, and detailed date objects with year, month, and day properties.

    RETURNS
      A string representing the date in YYYY-MM-DD format
    */
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
              // Convert to 0-based month for JS Date
              date.month - 1,
              date.day
            );

      if (isNaN(dateObj.getTime())) return "";

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Update the date of birth in the person details based on user input
    const updateDateOfBirth = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (personDetails.value) {
        // Create date at noon UTC to avoid timezone issues
        personDetails.value.person.dateOfBirth = input.value
          ? new Date(input.value + "T12:00:00Z")
          : undefined;
      }
    };

    // Update the date of death in the person details based on user input
    const updateDateOfDeath = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (personDetails.value) {
        // Create date at noon UTC to avoid timezone issues
        personDetails.value.person.dateOfDeath = input.value
          ? new Date(input.value + "T12:00:00Z")
          : undefined;
      }
    };

    /*
    NAME
      validateDates - validates the date of birth and date of death

    SYNOPSIS
      () => boolean
    
    DESCRIPTION
      This function validates the date of birth and date of death for a person.
      It checks that both dates are valid and that the date of death is not
      before the date of birth.

    RETURNS
      A boolean indicating whether the dates are valid
    */
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

    // Update the image URL in the person details and emit an event to update the tree
    const updateImage = (newImageUrl: string) => {
      if (personDetails.value) {
        personDetails.value.person.imageUrl = newImageUrl;
      }
      emit("changePicture", newImageUrl);
    };

    /*
    NAME
      toggleRootStatus - toggles the root status of the person
    
    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function toggles the root status of the person. It sends a request to
      the server to update the root status and updates the person details.

    RETURNS
      A Promise that resolves when the root status has been updated
    */
    const toggleRootStatus = async () => {
      // Do nothing if the user does not have edit permissions
      if (!hasEditPerms.value) return;

      // Send request to update the root status
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
          // Update the person details with the new root status
          personDetails.value!.isRoot = isRoot;
          fetchPerson();
        }
      } catch (error) {
        console.error("Error updating root status", error);
        errorMessage.value =
          "There was an error updating the root status. Please try again later.";
      }
    };
    /* toggleRootStatus */

    /*
    NAME
      toggleCurrentPartner - toggles the current partner of the person

    SYNOPSIS
      (partnerId: string) => Promise<void>
          partnerId   -->  the ID of the partner to toggle

    DESCRIPTION
      This function toggles the current partner of the person. It sends a request
      to the server to update the current partner and updates the person details.

    RETURNS
      A Promise that resolves when the current partner has been updated
    */
    const toggleCurrentPartner = async (partnerId: string) => {
      // Do nothing if the user does not have edit permissions
      if (!hasEditPerms.value) return;

      // Send request to update the current partner
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
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

        // Wait for the response and then refetch the person details
        await response.json();
        fetchPerson();
        // Emit an event to reload the tree
        emit("reloadTree");
      } catch (error) {
        console.error("Error updating person", error);
      }
    };
    /* toggleCurrentPartner */

    /*
    NAME
      textFocus - handles the focus event for text fields
    
    SYNOPSIS
      (event: FocusEvent) => void
          event   -->  the focus event that triggered the function

    DESCRIPTION
      This function handles the focus event for text fields. It highlights the
      inner text of the field and clears it if it is unset.

    RETURNS
      void
    */
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
    /* textFocus */

    /*
    NAME
      textBlur - handles the blur event for text fields
    
    SYNOPSIS
      (event: Event) => void
          event   -->  the blur event that triggered the function

    DESCRIPTION
      This function handles the blur event for text fields. It updates the person
      details with the new text and clears the field if it is empty.

    RETURNS
      void
    */
    const textBlur = (event: Event) => {
      // Do nothing if the blur was already handled by a key event
      if (blurredOnKey.value) {
        blurredOnKey.value = false;
        return;
      }
      // Reset gender suggestions to remove the box if it's there
      genderSuggestions.value = [];

      // Update the person details with the new text
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

    // Handle the enter key for the gender input box
    const enterGenderField = (event: KeyboardEvent) => {
      selectGenderSuggestion();
      genderSuggestions.value = [];
      enterField(event);
    };

    // Handle the enter key for text fields
    const enterField = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      target.blur();
    };

    /*
    NAME
      tabField - handles the tab key for text fields

    SYNOPSIS
      (event: KeyboardEvent) => void
          event   -->  the keydown event that triggered the function

    DESCRIPTION
      This function handles the tab key for text fields. It updates the person
      details with the new text and moves the focus to the next field.

    RETURNS
      void
    */
    const tabField = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const key = target.id as (typeof typeableFields)[number];

      if (target.id === "gender") {
        enterGenderField(event);
      } else {
        // Update the person details with the new text
        if (target.innerText !== "") {
          console.log("target inner text", target.innerText);
          (personDetails.value!.person[key as keyof TreeMember] as string) =
            target.innerText;
          target.classList.remove("unset");
        }
        // If the field is empty, set it to "Unset"
        else if (!personDetails.value!.person[key as keyof TreeMember]) {
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
      // Set the blurredOnKey flag to prevent the blur event from firing
      blurredOnKey.value = true;
    };
    /* tabField */

    /*
    NAME
      savePerson - saves the person details to the server

    SYNOPSIS
      () => Promise<void>
    
    DESCRIPTION
      This function saves the person details to the server. It sends a request to
      update the person details and shows a success message if the update is
      successful.

    RETURNS
      A Promise that resolves when the person details have been saved
    */
    const savePerson = async () => {
      if (!validateDates()) {
        errorMessage.value = "Date of death cannot be before date of birth";
        return;
      }

      // Attempt to save the person details to the server
      try {
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

        // After saving, fetch the person details again
        await fetchPerson();

        // Show a success message for a few seconds
        showSuccessMessage.value = true;
        setTimeout(() => {
          showSuccessMessage.value = false;
        }, 3000);

        // Emit a changeName event to update the tree
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
    /* savePerson */

    /*
    NAME
      removeConnection - removes a connection between two people

    SYNOPSIS
      (relatedId: string) => Promise<void>
          relatedId   -->  the ID of the person to remove the connection with
    
    DESCRIPTION
      This function removes a connection between two people. It sends a request
      to the server to remove the connection and updates the person details.

    RETURNS
      A Promise that resolves when the connection has been removed
    */
    const removeConnection = async (relatedId: string) => {
      // Do nothing if the user does not have edit permissions
      if (!hasEditPerms.value) return;

      // Send request to remove the connection
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

        // Wait for the response and then refetch the person details and reload the tree
        await fetchPerson();
        emit("reloadTree");
      } catch (error) {
        console.error("Error removing connection", error);
        errorMessage.value =
          "There was an error removing the connection. Please try again later.";
      }
    };
    /* removeConnection */

    // Reload the person in response to a change in connection values
    const reloadPerson = async () => {
      // Wait for a small delay to ensure new details are saved before refetching
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      await delay(100);

      // Reset the add suggestion boxes and refetch the person
      showAddChild.value = false;
      showAddParent.value = false;
      showAddPartner.value = false;
      await fetchPerson();
      emit("reloadTree");
    };

    // Close the person view box
    const closeBox = () => {
      emit("close");
    };

    // Compute the full name of the person
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

    // Fetch the person on mount
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
  top calc(100% + 4px)
  left 0
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
  background-color #d4edda
  color #155724
  border 1px solid #c3e6cb
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
