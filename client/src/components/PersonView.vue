<template lang="pug">
  .person-container
    .person-header 
      h2(v-if="person.firstName || person.middleName || person.lastName") {{person.firstName ?? ""}} {{ person.middleName ?? ""}} {{person.lastName ?? ""}}
      h2(v-else) Unnamed Person
    .person-image
      img(v-if="person.imageUrl" :src="person.imageUrl" alt="Person Image")
      img(v-else src="@/assets/default_person.svg" alt="Default Person Image" height="200px")
    .person-data
      h3 Data
      .data-row
        span.data-label First Name: 
        span.data-value {{ person.firstName ?? "" }}
      .data-row
        span.data-label Middle Name: 
        span.data-value {{ person.middleName ?? "" }}
      .data-row
        span.data-label Last Name: 
        span.data-value {{ person.lastName }}
      .data-row
        span.data-label Gender: 
        span.data-value {{ person.gender }}
      .data-row
        span.data-label Date of Birth: 
        span.data-value {{ person.dateOfBirth }}
      .data-row
        span.data-label Date of Death: 
        span.data-value {{ person.dateOfDeath }}
      .data-row
        span.data-label Location: 
        span.data-value {{ person.location }}
    .connections
      h3 Connections
      .connection-row
        span.connection-label Relation to Root: 
        span.connection-value {{ person.relationToRoot ?? "unrelated" }}
      .connection-row(v-if="person.parents.length > 0")
        span.connection-label Partners: 
        ul.connection-list
          li.connection-item(v-for="partner in person.partners") {{ partner }}
      .connection-row(v-if="person.currentPartner")
        span.connection-label Current Partner: 
        span.connection-value {{ person.currentPartner }}
      .connection-row(v-if="person.parents.length > 0")
        span.connection-label Parents: 
        ul.connection-list
          li.connection-item(v-for="parent in person.parents") {{ parent }}
      .connection-row(v-if="person.children.length > 0")
        span.connection-label Children: 
        ul.connection-list
          li.connection-item(v-for="child in person.children") {{ child }}


      
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { type Person } from "@/helpers/treeToNodes";

export default defineComponent({
  name: "PersonView",
  props: {
    person: {
      type: Object as () => Person,
      default: () => ({
        id: "testId",
        relationToRoot: "testRelation",
        parents: [],
        partners: [],
        children: [],
      }),
    },
  },
  setup() {
    return {};
  },
});
</script>

<style lang="stylus" scoped></style>
