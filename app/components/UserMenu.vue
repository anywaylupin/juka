<script setup lang="ts">
import type { AuthProvider } from '#shared/types/auth';

const { t } = useI18n();
const toast = useToast();
const session = useSession();
const store = useCardStore();

const authOpen = ref(false);
const settingsOpen = ref(false);
const ratingsOpen = ref(false);

/*
 * The sign-in reminder toast lives outside this component but its action has to open the dialog this component owns, so it raises a flag and this watches it.
 */
const { requested } = useSignInReminder();

watch(requested, (value) => {
  if (value) {
    authOpen.value = true;
    requested.value = false;
  }
});

const username = ref('');
const email = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const savingProfile = ref(false);
const linking = ref<AuthProvider | null>(null);

watch(
  () => session.account.value,
  (account) => {
    username.value = account?.username ?? '';
    email.value = account?.email ?? '';
  },
  { immediate: true }
);

/**
 * An account made through a provider has no password until someone sets one, and the form has to know.
 * There is no current password to ask for, and asking anyway would leave that person unable to set a first one.
 */
const hasPassword = computed(() => session.account.value?.hasPassword ?? true);
const linked = computed(() => session.account.value?.providers ?? []);

/** Icon and wording per provider, shared with the sign-in panel. */
const providerLabels: Record<AuthProvider, { icon: string; label: string }> = {
  github: { icon: 'i-lucide-github', label: 'GitHub' },
  google: { icon: 'i-lucide-chrome', label: 'Google' }
};

/**
 * Connecting sends the person through the provider and back, exactly as signing in does.
 * The callback finds a live session and links to it rather than making a second account, which is the case signInWithProvider handles second.
 */
function connect(provider: AuthProvider) {
  window.location.href = `/auth/${provider}`;
}

async function disconnect(provider: AuthProvider) {
  linking.value = provider;
  try {
    await session.unlinkProvider(provider);
    toast.add({
      title: t('account.disconnected', { provider: providerLabels[provider].label }),
      icon: 'i-lucide-check'
    });
  } catch (error) {
    const message =
      (error as { data?: { message?: string } })?.data?.message ?? (error instanceof Error ? error.message : undefined);
    toast.add({ title: t('account.notSaved'), description: message, icon: 'i-lucide-triangle-alert', color: 'error' });
  } finally {
    linking.value = null;
  }
}

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
    // The store watches the account and re-reads, so what comes back is whatever was in local storage all along.
    // Nothing was moved.
    toast.add({ title: t('auth.signedOut'), description: t('auth.backToLocal'), icon: 'i-lucide-check' });
  } catch {
    toast.add({ title: t('auth.failed'), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}

async function saveProfile() {
  if (newPassword.value && newPassword.value !== confirmPassword.value) {
    toast.add({ title: t('auth.passwordsDiffer'), icon: 'i-lucide-triangle-alert', color: 'error' });
    return;
  }

  savingProfile.value = true;
  try {
    await session.updateProfile({
      username: username.value.trim().toLowerCase(),
      email: email.value.trim() || null,
      ...(newPassword.value
        ? {
            password: newPassword.value,
            confirmPassword: confirmPassword.value,
            ...(hasPassword.value ? { currentPassword: currentPassword.value } : {})
          }
        : {})
    });
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
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
            <UInput v-model="username" autocapitalize="none" spellcheck="false" class="w-full" icon="i-lucide-user" />
          </UFormField>

          <UFormField :label="t('auth.email')" :help="t('account.emailHelp')">
            <UInput v-model="email" type="email" class="w-full" icon="i-lucide-mail" />
          </UFormField>

          <USeparator :label="hasPassword ? t('account.changePassword') : t('account.setPassword')" />

          <UFormField v-if="hasPassword" :label="t('account.currentPassword')">
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

          <UFormField :label="t('auth.confirmPassword')">
            <UInput
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
              icon="i-lucide-lock-keyhole"
            />
          </UFormField>

          <!--
            Providers, when this deployment has any.
            Disconnecting the last way in is refused by the route rather than hidden here, so the reason can be said out loud.
          -->
          <template v-if="session.providers.value.length > 0">
            <USeparator :label="t('account.connections')" />

            <div class="space-y-2">
              <div
                v-for="provider in session.providers.value"
                :key="provider"
                class="flex items-center justify-between gap-3 rounded-lg bg-elevated px-3 py-2"
              >
                <span class="flex items-center gap-2 text-sm">
                  <UIcon :name="providerLabels[provider].icon" class="size-4" />
                  {{ providerLabels[provider].label }}
                </span>

                <UButton
                  v-if="linked.includes(provider)"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :loading="linking === provider"
                  @click="disconnect(provider)"
                >
                  {{ t('account.disconnect') }}
                </UButton>
                <UButton v-else color="neutral" variant="soft" size="xs" @click="connect(provider)">
                  {{ t('account.connect') }}
                </UButton>
              </div>
            </div>
          </template>

          <UButton type="submit" :loading="savingProfile" color="primary" size="lg" block>
            {{ t('card.save') }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
