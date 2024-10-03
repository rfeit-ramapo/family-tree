<template lang="pug">
    .user-card-component
      .user-card-component__avatar
        img(:src='`${avatar}`' class='user-card-component__avatar-image')
  
      .user-card-component__name {{ username }}
  
      .user-card-component__email {{ email }}
  
      .user-card-component__action
        button(@click="$emit('contactUser')") Contact {{ lastName }}
</template>
