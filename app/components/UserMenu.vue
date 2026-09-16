<script setup lang="ts">
const { t } = useI18n();
const toast = useToast();
const session = useSession();
const store = useCardStore();

const authOpen = ref(false);
const settingsOpen = ref(false);
const ratingsOpen = ref(false);

/*
 * The sign-in reminder toast lives outside this component but its action has to
 * open the dialog this component owns, so it raises a flag and this watches it.
 */
const { requested } = useSignInReminder();

watch(requested, (value) => {
  if (value) {
    authOpen.value = true;
    requested.value = false;
  }
});

const email = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const savingProfile = ref(false);

watch(
  () => session.account.value,
  (account) => {
    email.value = account?.email ?? '';
  },
  { immediate: true }
);

/** Cards live locally until there is an account, and the menu says which. */
const storageLabel = computed(() =>
  session.signedIn.value
    ? t('account.storedOnAccount', { username: session.account.value?.username ?? '' })
    : t('account.storedLocally', { count: store.cards.value.length })
);

const items = computed(() => {
  if (!session.signedIn.value) {
    return [
      [
        { label: storageLabel.value, icon: 'i-lucide-hard-drive', type: 'label' as const },
        {
          label: t('rating.settings'),
          icon: 'i-lucide-sliders-vertical',
          onSelect: () => {
            ratingsOpen.value = true;
          }
        },
        {
          label: t('auth.signIn'),
          icon: 'i-lucide-log-in',
          onSelect: () => {
            authOpen.value = true;
          }
        }
      ]
    ];
  }

  return [
    [{ label: storageLabel.value, icon: 'i-lucide-cloud', type: 'label' as const }],
    [
      {
        label: t('rating.settings'),
        icon: 'i-lucide-sliders-vertical',
        onSelect: () => {
          ratingsOpen.value = true;
        }
      },
      {
        label: t('account.settings'),
        icon: 'i-lucide-settings',
        onSelect: () => {
          settingsOpen.value = true;
        }
      },
      { label: t('auth.signOut'), icon: 'i-lucide-log-out', onSelect: () => signOut() }
    ]
  ];
});

async function signOut() {
  try {
    await session.logout();
    // The store watches the account and re-reads, so what comes back is
    // whatever was in local storage all along. Nothing was moved.
    toast.add({ title: t('auth.signedOut'), description: t('auth.backToLocal'), icon: 'i-lucide-check' });
  } catch {
    toast.add({ title: t('auth.failed'), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}

async function saveProfile() {
  savingProfile.value = true;
  try {
    await session.updateProfile({
      email: email.value.trim() || null,
      ...(newPassword.value ? { password: newPassword.value, currentPassword: currentPassword.value } : {})
    });
    currentPassword.value = '';
    newPassword.value = '';
    settingsOpen.value = false;
    toast.add({ title: t('account.saved'), icon: 'i-lucide-check', color: 'success' });
  } catch (error) {
    const message =
      (error as { data?: { message?: string } })?.data?.message ?? (error instanceof Error ? error.message : undefined);
    toast.add({ title: t('account.notSaved'), description: message, icon: 'i-lucide-triangle-alert', color: 'error' });
  } finally {
    savingProfile.value = false;
  }
}
</script>

<template>
  <div>
    <UDropdownMenu :items="items">
      <UTooltip :text="session.signedIn.value ? (session.account.value?.username ?? '') : t('auth.signIn')">
        <UButton
          :icon="session.signedIn.value ? 'i-lucide-circle-user-round' : 'i-lucide-user'"
          :color="session.signedIn.value ? 'primary' : 'neutral'"
          variant="ghost"
          :aria-label="t('account.menu')"
        />
      </UTooltip>
    </UDropdownMenu>

    <UModal v-model:open="authOpen" :title="t('auth.title')" :description="t('auth.subtitle')">
      <template #body>
        <AuthPanel @done="authOpen = false" />
      </template>
    </UModal>

    <UModal v-model:open="ratingsOpen" :title="t('rating.settings')">
      <template #body>
        <RatingSettings />
      </template>
    </UModal>

    <UModal v-model:open="settingsOpen" :title="t('account.settings')">
      <template #body>
        <form class="space-y-4" @submit.prevent="saveProfile">
          <UFormField :label="t('auth.username')">
            <UInput :model-value="session.account.value?.username ?? ''" disabled class="w-full" icon="i-lucide-user" />
          </UFormField>

          <UFormField :label="t('auth.email')" :help="t('auth.emailHelp')">
            <UInput v-model="email" type="email" class="w-full" icon="i-lucide-mail" />
          </UFormField>

          <USeparator :label="t('account.changePassword')" />

          <UFormField :label="t('account.currentPassword')">
            <UInput
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              class="w-full"
              icon="i-lucide-lock"
            />
          </UFormField>

          <UFormField :label="t('account.newPassword')">
            <UInput
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
              icon="i-lucide-lock-keyhole"
            />
          </UFormField>

          <UButton type="submit" :loading="savingProfile" color="primary" size="lg" block>
            {{ t('card.save') }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
