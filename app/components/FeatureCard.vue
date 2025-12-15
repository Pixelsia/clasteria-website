<script setup lang="ts">
interface Props {
  icon: string;
  title: string;
  description: string;
  href: string;
  color?: 'primary' | 'secondary';
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
});

const colorClasses = computed(() => ({
  border: props.color === 'primary'
    ? 'border-primary-200 dark:border-primary-700'
    : 'border-secondary-200 dark:border-secondary-700',
  iconBg: props.color === 'primary'
    ? 'bg-primary-100'
    : 'bg-secondary-100',
  iconText: props.color === 'primary'
    ? 'text-primary-600'
    : 'text-secondary-600',
  link: props.color === 'primary'
    ? 'text-primary-600'
    : 'text-secondary-600',
}));
</script>

<template>
  <div :class="['bg-white dark:bg-neutral-700 rounded-2xl border-2 p-6 min-h-64 flex flex-col', colorClasses.border]">
    <div :class="['rounded-full w-12 h-12 flex items-center justify-center mb-4', colorClasses.iconBg]">
      <UIcon
        :name="icon"
        :class="['w-6 h-6', colorClasses.iconText]"
      />
    </div>
    <h3 class="text-xl font-bold text-primary-900 mb-2">
      {{ title }}
    </h3>
    <p class="text-neutral-600 dark:text-neutral-300 text-base grow">
      {{ description }}
    </p>
    <a
      :href="href"
      :class="['text-sm mt-4 hover:underline', colorClasses.link]"
    >詳細を見る</a>
  </div>
</template>
