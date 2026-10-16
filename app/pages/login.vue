<script setup lang="ts">
/**
 * Signing in, as a page rather than a dialog, so it has an address you can be sent to and room to breathe.
 *
 * Someone already signed in has nothing to do here and goes back to the box.
 */
const { t } = useI18n();
useSeoMeta({ title: () => `${t('auth.signIn')} · Juka` });

const localePath = useLocalePath();
const session = useSession();

async function done() {
  await navigateTo(localePath('/'));
}

watch(
  () => session.signedIn.value,
  (signedIn) => {
    if (signedIn) {
      done();
    }
  }
);
</script>

<template>
  <div class="flex justify-center lg:h-full lg:items-center">
    <UCard class="w-full max-w-md">
      <div class="mb-4 flex items-center gap-3">
        <AppLogo class="h-12 text-3xl" />
        <div>
          <h1 class="font-display text-2xl font-bold text-highlighted">{{ t('auth.title') }}</h1>
          <p class="text-sm text-muted">{{ t('auth.subtitle') }}</p>
        </div>
      </div>
      <AuthPanel @done="done" />
    </UCard>
  </div>
</template>
