<script setup lang="ts">
/**
 * The account corner of the phone top bar: your profile when signed in, the sign-in page when not.
 *
 * The sign-in reminder asks for the sign-in page through `requested`, so it never has to know where that page lives.
 */
const { t } = useI18n();
const localePath = useLocalePath();
const session = useSession();
const { requested } = useSignInReminder();

watch(requested, async (value) => {
  if (value) {
    requested.value = false;
    await navigateTo(localePath('/login'));
  }
});
</script>

<template>
  <!-- A fixed slot, so swapping "Sign in" for the account icon once the session loads does not shove the bar sideways. -->
  <div class="flex justify-end sm:w-24">
    <UButton
      v-if="session.signedIn.value"
      :to="localePath('/settings')"
      icon="i-lucide-circle-user-round"
      color="neutral"
      variant="ghost"
      :aria-label="t('nav.profile')"
    />
    <UButton v-else :to="localePath('/login')" color="neutral" variant="outline" icon="i-lucide-log-in">
      <span class="hidden sm:inline">{{ t('auth.signIn') }}</span>
      <span class="sr-only sm:hidden">{{ t('auth.signIn') }}</span>
    </UButton>
  </div>
</template>
