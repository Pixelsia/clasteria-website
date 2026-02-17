<template>
  <div class="bg-primary-50 dark:bg-neutral-800">
    <LayoutHeader />
    <UMain>
      <UContainer>
        <UPage as="article">
          <slot />
        </UPage>
      </UContainer>
    </UMain>
    <LayoutFooter />
  </div>
</template>
