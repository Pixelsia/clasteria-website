<script setup lang="ts">
interface Props {
  title: string;
  subtitle?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="text-center">
    <h2 class="text-3xl font-bold text-primary-900">
      {{ title }}
    </h2>
    <p
      v-if="subtitle"
      class="text-primary-600 mt-4"
    >
      {{ subtitle }}
    </p>
  </div>
</template>
