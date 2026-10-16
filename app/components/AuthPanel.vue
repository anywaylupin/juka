<script setup lang="ts">
import { loginSchema, registerSchema } from '#shared/schemas/auth';
import type { AuthProvider } from '#shared/types/auth';

/**
 * Signing in, signing up, and the one decision that matters either way: what to do with the cards already in this browser.
 *
 * An account is optional.
 * The offer is storage that survives a cleared browser and reaches a second device, not a gate, and the copy says so rather than implying the app needs one.
 *
 * Two modes rather than two panels, because they are the same form with different fields and moving between them should not feel like navigating.
 * The forgotten password link is off for now at the author's request; `/reset` and the routes behind it still work for a link already sent.
 * The submit and the provider buttons stand in one column at the foot, so every way in is in the same place.
 */
const emit = defineEmits<{ done: [] }>();

const { t } = useI18n();
const toast = useToast();
const session = useSession();
const store = useCardStore();

type Mode = 'login' | 'register';

const mode = ref<Mode>('login');
const identifier = ref('');
const password = ref('');
const confirmPassword = ref('');
const email = ref('');
const busy = ref(false);

/** Cards sitting in local storage right now, which signing in can copy up. */
const pending = computed(() => store.localCards().length);
const bringLocal = ref(true);

const tabs = computed(() => [
  { label: t('auth.signIn'), value: 'login' as const },
  { label: t('auth.createAccount'), value: 'register' as const }
]);

/** Icon and wording per provider, so a button says which account it will use. */
const providerLabels: Record<AuthProvider, { icon: string; label: string }> = {
  github: { icon: 'i-lucide-github', label: 'GitHub' },
  google: { icon: 'i-lucide-chrome', label: 'Google' }
};

onMounted(() => session.loadProviders());

function fail(error: unknown) {
  const message =
    (error as { data?: { message?: string } })?.data?.message ?? (error instanceof Error ? error.message : undefined);

  toast.add({ title: t('auth.failed'), description: message, icon: 'i-lucide-triangle-alert', color: 'error' });
}

/**
 * A provider sign-in leaves the app and comes back, so there is no promise to await here.
 * The callback lands on the card page with a query flag, which is where the welcome toast happens.
 */
function useProvider(provider: AuthProvider) {
  window.location.href = `/auth/${provider}`;
}

async function submit() {
  const schema = mode.value === 'login' ? loginSchema : registerSchema;
  const parsed = schema.safeParse(
    mode.value === 'login'
      ? { identifier: identifier.value, password: password.value }
      : {
          username: identifier.value,
          password: password.value,
          confirmPassword: confirmPassword.value,
          email: email.value
        }
  );

  if (!parsed.success) {
    toast.add({
      title: parsed.error.issues[0]?.message ?? t('auth.checkDetails'),
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    });
    return;
  }

  // Read before signing in: the store swaps to the account the moment the session lands, and the local list is no longer what is in memory.
  const local = store.localCards();

  busy.value = true;
  try {
    if (mode.value === 'login') {
      await session.login({ identifier: identifier.value, password: password.value });
    } else {
      await session.register({
        username: identifier.value,
        password: password.value,
        confirmPassword: confirmPassword.value,
        email: email.value.trim() || null
      });
    }

    if (bringLocal.value && local.length > 0) {
      const result = await session.mergeLocal(
        local.map((card) => ({
          hanzi: card.hanzi,
          pinyin: card.pinyin,
          hanViet: card.hanViet,
          translation: card.translation,
          pos: card.pos,
          rating: card.rating,
          notes: card.notes
        }))
      );

      await store.load();

      toast.add({
        title: t('auth.merged', { added: result.added }),
        description: result.skipped > 0 ? t('auth.mergedSkipped', { skipped: result.skipped }) : undefined,
        icon: 'i-lucide-check',
        color: 'success'
      });
    } else {
      toast.add({
        title: t('auth.welcome', { username: session.account.value?.username ?? identifier.value }),
        icon: 'i-lucide-check',
        color: 'success'
      });
    }

    emit('done');
  } catch (error) {
    fail(error);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <UTabs v-model="mode" :items="tabs" :content="false" color="neutral" variant="link" size="md" class="juka-tabs" />

    <UFormField :label="mode === 'register' ? t('auth.username') : t('auth.identifier')">
      <UInput
        v-model="identifier"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        class="w-full"
        icon="i-lucide-user"
      />
    </UFormField>

    <UFormField :label="t('auth.password')">
      <UInput
        v-model="password"
        type="password"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        class="w-full"
        icon="i-lucide-lock"
      />
    </UFormField>

    <!--
      Typed twice, because it is the one field nobody can read back to check.
      The sign-up fields stay in the layout on the sign-in tab, hidden and moved to the end, so the form keeps one size while the spare room falls below the buttons rather than above them.
    -->
    <UFormField
      :label="t('auth.confirmPassword')"
      :class="mode !== 'register' && 'invisible order-last max-lg:hidden'"
      :aria-hidden="mode !== 'register'"
    >
      <UInput
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        class="w-full"
        icon="i-lucide-lock"
      />
    </UFormField>

    <UFormField
      :label="t('auth.email')"
      :help="t('auth.emailHelp')"
      :class="mode !== 'register' && 'invisible order-last max-lg:hidden'"
      :aria-hidden="mode !== 'register'"
    >
      <UInput v-model="email" type="email" autocomplete="email" class="w-full" icon="i-lucide-mail" />
    </UFormField>

    <!--
      Offered, not assumed, and worded so it is clear nothing is moved.
      The local copy stays exactly where it is either way, which is what makes signing out safe.
    -->
    <div v-if="pending > 0" class="flex items-start justify-between gap-4 rounded-md bg-muted px-4 py-3">
      <div>
        <p class="text-sm font-semibold text-highlighted">{{ t('auth.bringTitle', { count: pending }) }}</p>
        <p class="text-xs text-muted">{{ t('auth.bringHint') }}</p>
      </div>
      <USwitch v-model="bringLocal" :aria-label="t('auth.bringSwitch')" />
    </div>

    <div class="grid gap-2 pt-1">
      <UButton type="submit" :loading="busy" size="lg" block class="juka-seal-button">
        {{ mode === 'login' ? t('auth.signIn') : t('auth.createAccount') }}
      </UButton>
      <!-- Only the providers this deployment has keys for: a button that 500s is worse than no button. -->
      <UButton
        v-for="provider in session.providers.value"
        :key="provider"
        :icon="providerLabels[provider].icon"
        color="neutral"
        variant="outline"
        size="lg"
        block
        @click="useProvider(provider)"
      >
        {{ t('auth.continueWith', { provider: providerLabels[provider].label }) }}
      </UButton>
    </div>

    <p class="text-center text-xs text-dimmed">{{ t('auth.optional') }}</p>
  </form>
</template>
