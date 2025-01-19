/** This component handles the image upload functionality for the person image
in the PersonDetails component. It allows the user to upload, update, or remove
an image for a person. The component displays the current image, an overlay with
text prompting the user to change or add an image, and a modal for uploading a
new image or removing the current image. If the user does not have edit
permissions, the overlay and modal are not displayed. */

<template lang="pug">
  .person-image-container
    .image-wrapper(
      @mouseenter="showOverlay = true"
      @mouseleave="showOverlay = false"
      @click="handleImageClick"
    )
      // The image is displayed if available
      img.person-image(
        v-if="currentImage"
        :src="getFullImageUrl(currentImage)"
        alt="Person Image"
      )
      // Otherwise use a default image
      img.person-image(
        v-else
        src="@/assets/default_person.svg"
        alt="Default Person Image"
      )
      
      // Overlay for editing (only shown if user has edit permissions)
      .image-overlay(v-if="showOverlay && hasEditPerms")
        span.overlay-text {{ currentImage ? 'Change Image' : 'Add Image' }}
    
    // Modal for uploading a new image or removing the current image
    .modal-backdrop(
      v-if="showModal"
      @click="closeModal"
    )
      .modal-content(@click.stop)
        h3 {{ currentImage ? 'Update Image' : 'Add Image' }}
        .modal-actions
          input(
            type="file"
            ref="fileInput"
            accept="image/*"
            style="display: none"
            @change="handleFileUpload"
         )
          button.btn.btn-primary(
            @click="triggerFileInput"
          ) Upload New Image
          button.btn.btn-danger(
            v-if="currentImage"
            @click="removeImage"
          ) Remove Image
          button.btn.btn-secondary(
            @click="closeModal"
          ) Cancel
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";

export default defineComponent({
  name: "ImageUpload",
  props: {
    // The initial image URL to display
    initialImage: {
      type: String,
      default: "",
    },
    // The ID of the person the image belongs to
    personId: {
      type: String,
      required: true,
    },
    // Whether the user has edit permissions for the image
    hasEditPerms: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:image", "error"],

  setup(props, { emit }) {
    // Reactive variables

    // Whether to show the overlay
    const showOverlay = ref(false);
    // Whether to show the modal
    const showModal = ref(false);
    // Reference to the file input element
    const fileInput = ref<HTMLInputElement | null>(null);
    // The current image URL
    const currentImage = ref(props.initialImage);

    // Watch for changes to the initial image prop
    watch(
      () => props.initialImage,
      (newValue) => {
        // Update the current image when the prop changes
        currentImage.value = newValue;
      }
    );

    // Handle showing the modal when the user clicks on the image
    const handleImageClick = () => {
      if (props.hasEditPerms) showModal.value = true;
    };

    // Close the modal
    const closeModal = () => {
      showModal.value = false;
    };

    // Trigger the file input element to open the file dialog
    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    /*
    NAME
      handleFileUpload - handles the upload of a new image file

    SYNOPSIS
      (event: Event) => Promise<void>
          event   --> the event that triggered the file upload

    DESCRIPTION
      This function handles the file upload process. It is triggered when the user 
      selects a file using the file input element. The file is uploaded to the server
      and the image URL is updated if the upload is successful.

    RETURNS
      A Promise<void> that resolves when the file is uploaded successfully.
    */
    const handleFileUpload = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];

      if (file) {
        try {
          // Create FormData for upload
          const formData = new FormData();
          formData.append("image", file);
          formData.append("personId", props.personId);

          // Upload image to server
          const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
          });
          if (!response.ok) {
            throw new Error("Failed to upload image");
          }

          // Get the image URL from the response and set it as the current image
          const { imageUrl } = await response.json();
          currentImage.value = imageUrl;
          // Emit an image update event to the parent component
          emit("update:image", imageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
          emit("error");
        }
      }

      // Close the modal and reset the input after upload
      closeModal();
      input.value = "";
    };

    /*
    NAME
      removeImage - removes the current image from the person

    SYNOPSIS
      () => Promise<void>

    DESCRIPTION
      This function removes the current image from the person. It sends a request
      to the server to remove the image and updates the current image URL to an
      empty string.

    RETURNS
      A Promise<void> that resolves when the image is removed successfully.
    */
    const removeImage = async () => {
      // Send request to remove image
      try {
        const personId = props.personId;
        const response = await fetch(`/api/remove-image/${personId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        // Wait for ok response before updating the current image and alerting parent
        await response.json();
        currentImage.value = "";
        emit("update:image", "");
      } catch (error) {
        console.error("Error removing image:", error);
        emit("error");
      }
      // Close the modal after removing the image
      closeModal();
    };

    // Get the full image URL by prepending the API URL
    const getFullImageUrl = (imageUrl: string) => {
      // If the URL is already absolute (starts with http), return as is
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      }
      // Otherwise prepend the API URL
      return `${import.meta.env.VITE_SERVER_URL}${imageUrl}`;
    };

    return {
      showOverlay,
      showModal,
      fileInput,
      currentImage,
      handleImageClick,
      closeModal,
      triggerFileInput,
      handleFileUpload,
      removeImage,
      getFullImageUrl,
    };
  },
});
</script>

<style lang="stylus" scoped>
.person-image-container
  width 100%
  margin-bottom 24px

.image-wrapper
  position relative
  width 100%
  height 200px
  cursor pointer
  border-radius 8px
  overflow hidden

.person-image
  width 100%
  height 100%
  object-fit contain
  border-radius 8px
  transition transform 0.3s ease

.image-overlay
  position absolute
  top 0
  left 0
  width 100%
  height 100%
  background-color rgba(0, 0, 0, 0.5)
  display flex
  justify-content center
  align-items center
  opacity 0
  transition opacity 0.3s ease

  &:hover
    opacity 1

.overlay-text
  color white
  font-size 1.2em
  font-weight bold

.modal-backdrop
  position fixed
  top 0
  left 0
  width 100%
  height 100%
  background-color rgba(0, 0, 0, 0.5)
  display flex
  justify-content center
  align-items center
  z-index 1000

.modal-content
  background-color white
  padding 24px
  border-radius 8px
  max-width 400px

  h3
    margin-top 0
    margin-bottom 20px
    text-align center

.modal-actions
  display flex
  flex-direction column
  gap 12px

  button
    padding 8px 16px
    border-radius 4px
    border none
    cursor pointer
    font-weight bold
    transition background-color 0.3s ease

    &.btn-primary
      background-color #2e8b57
      color white
      &:hover
        background-color darken(#2e8b57, 10%)

    &.btn-danger
      background-color #dc3545
      color white
      &:hover
        background-color darken(#dc3545, 10%)

    &.btn-secondary
      background-color #6c757d
      color white
      &:hover
        background-color darken(#6c757d, 10%)
</style>
