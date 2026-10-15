<script setup lang="ts">
/**
 * The account corner of the top bar.
 *
 * Signed out it is a sign-in button, because that is the only thing an account offers someone without one.
 * Signed in it is a link to the settings page, where every account preference now lives.
 */
const { t } = useI18n();
const session = useSession();
const localePath = useLocalePath();

const authOpen = useState('juka:auth-open', () => false);

/** The sign-in reminder toast raises this flag, because the dialog it needs lives here. */
const { requested } = useSignInReminder();

watch(requested, (value) => {
  if (value) {
    authOpen.value = true;
    requested.value = false;
  }
});
</script>

<template>
  <div>
    <UTooltip
      v-if="session.signedIn.value"
      :text="t('account.settingsFor', { username: session.account.value?.username ?? '' })"
    >
      <UButton
        :to="localePath('/settings')"
        icon="i-lucide-circle-user-round"
        color="neutral"
        variant="ghost"
        :aria-label="t('nav.settings')"
      />
    </UTooltip>
    <UButton v-else color="neutral" variant="outline" icon="i-lucide-log-in" @click="authOpen = true">
      <span class="hidden sm:inline">{{ t('auth.signIn') }}</span>
      <span class="sr-only sm:hidden">{{ t('auth.signIn') }}</span>
    </UButton>

    <UModal v-model:open="authOpen" :title="t('auth.title')" :description="t('auth.subtitle')">
      <template #body>
        <AuthPanel @done="authOpen = false" />
      </template>
    </UModal>
  </div>
</template>
