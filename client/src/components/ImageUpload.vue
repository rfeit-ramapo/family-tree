<template lang="pug">
  .person-image-container
    .image-wrapper(
      @mouseenter="showOverlay = true"
      @mouseleave="showOverlay = false"
      @click="handleImageClick"
    )
      img.person-image(
        v-if="currentImage"
        :src="getFullImageUrl(currentImage)"
        alt="Person Image"
      )
      img.person-image(
        v-else
        src="@/assets/default_person.svg"
        alt="Default Person Image"
      )
        
      .image-overlay(v-if="showOverlay && hasEditPerms")
        span.overlay-text {{ currentImage ? 'Change Image' : 'Add Image' }}
    
      //- Image Upload Modal
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
    initialImage: {
      type: String,
      default: "",
    },
    personId: {
      type: String,
      required: true,
    },
    hasEditPerms: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:image", "error"],
  setup(props, { emit }) {
    const showOverlay = ref(false);
    const showModal = ref(false);
    const fileInput = ref<HTMLInputElement | null>(null);
    const currentImage = ref(props.initialImage);

    watch(
      () => props.initialImage,
      (newValue) => {
        currentImage.value = newValue;
      }
    );

    const handleImageClick = () => {
      if (props.hasEditPerms) showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
    };

    const triggerFileInput = () => {
      fileInput.value?.click();
    };

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

          const { imageUrl } = await response.json();
          currentImage.value = imageUrl;
          emit("update:image", imageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
          // Handle error (show message to user)
          emit("error");
        }
      }

      closeModal();
      input.value = ""; // Reset input
    };

    const removeImage = async () => {
      currentImage.value = "";
      try {
        // Upload image to server
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

        await response.json();
        currentImage.value = "";
        emit("update:image", "");
      } catch (error) {
        console.error("Error removing image:", error);
        // Handle error (show message to user)
        emit("error");
      }

      closeModal();
    };

    const getFullImageUrl = (imageUrl: string) => {
      // If the URL is already absolute (starts with http), return as is
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      }
      // Otherwise prepend the API URL
      console.log(
        "Full Image URL:",
        `${import.meta.env.VITE_SERVER_URL}${imageUrl}`
      );
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
