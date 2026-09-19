<script setup lang="ts">
import { loginSchema, registerSchema, passwordResetRequestSchema } from '#shared/schemas/auth';
import type { AuthProvider } from '#shared/types/auth';

/**
 * Signing in, signing up, getting back in, and the one decision that matters either way: what to do with the cards already in this browser.
 *
 * An account is optional.
 * The offer is storage that survives a cleared browser and reaches a second device, not a gate, and the copy says so rather than implying the app needs one.
 *
 * Three modes rather than three panels, because they are the same form with different fields and moving between them should not feel like navigating.
 */
const emit = defineEmits<{ done: [] }>();

const { t } = useI18n();
const toast = useToast();
const session = useSession();
const store = useCardStore();

type Mode = 'login' | 'register' | 'forgot';

const mode = ref<Mode>('login');
const identifier = ref('');
const password = ref('');
const confirmPassword = ref('');
const email = ref('');
const busy = ref(false);
const sent = ref(false);

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

async function requestReset() {
  const parsed = passwordResetRequestSchema.safeParse({ identifier: identifier.value });

  if (!parsed.success) {
    toast.add({
      title: parsed.error.issues[0]?.message ?? t('auth.checkDetails'),
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    });
    return;
  }

  busy.value = true;
  try {
    await session.requestReset(identifier.value);
    // Said the same way whether or not the account exists, because the answer must not say.
    sent.value = true;
  } catch (error) {
    fail(error);
  } finally {
    busy.value = false;
  }
}

async function submit() {
  if (mode.value === 'forgot') {
    await requestReset();
    return;
  }

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
  <form class="space-y-4" @submit.prevent="submit">
    <UTabs v-if="mode !== 'forgot'" v-model="mode" :items="tabs" :content="false" size="sm" />

    <!--
      Providers first, because for most people it is one click against a password they would otherwise have to invent.
      Only the ones this deployment has keys for are here: a button that 500s is worse than no button.
    -->
    <template v-if="mode !== 'forgot' && session.providers.value.length > 0">
      <div class="grid gap-2" :class="session.providers.value.length > 1 && 'sm:grid-cols-2'">
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

      <USeparator :label="t('auth.or')" />
    </template>

    <UFormField
      :label="mode === 'register' ? t('auth.username') : t('auth.identifier')"
      :help="mode === 'forgot' ? t('auth.forgotHelp') : undefined"
    >
      <UInput
        v-model="identifier"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        class="w-full"
        icon="i-lucide-user"
      />
    </UFormField>

    <template v-if="mode !== 'forgot'">
      <UFormField :label="t('auth.password')">
        <UInput
          v-model="password"
          type="password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          class="w-full"
          icon="i-lucide-lock"
        />
      </UFormField>

      <!-- Typed twice, because it is the one field nobody can read back to check. -->
      <UFormField v-if="mode === 'register'" :label="t('auth.confirmPassword')">
        <UInput
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          class="w-full"
          icon="i-lucide-lock"
        />
      </UFormField>

      <UFormField v-if="mode === 'register'" :label="t('auth.email')" :help="t('auth.emailHelp')">
        <UInput v-model="email" type="email" autocomplete="email" class="w-full" icon="i-lucide-mail" />
      </UFormField>
    </template>

    <UAlert
      v-if="mode === 'forgot' && sent"
      color="success"
      variant="subtle"
      icon="i-lucide-mail-check"
      :title="t('auth.resetSentTitle')"
      :description="t('auth.resetSentHint')"
    />

    <!--
      Offered, not assumed, and worded so it is clear nothing is moved.
      The local copy stays exactly where it is either way, which is what makes signing out safe.
    -->
    <UAlert
      v-if="mode !== 'forgot' && pending > 0"
      color="neutral"
      variant="subtle"
      icon="i-lucide-copy"
      :title="t('auth.bringTitle', { count: pending })"
      :description="t('auth.bringHint')"
    >
      <template #actions>
        <USwitch v-model="bringLocal" :label="t('auth.bringSwitch')" />
      </template>
    </UAlert>

    <UButton type="submit" :loading="busy" color="primary" size="lg" block>
      {{
        mode === 'login' ? t('auth.signIn') : mode === 'register' ? t('auth.createAccount') : t('auth.sendResetLink')
      }}
    </UButton>

    <div class="flex items-center justify-between gap-2">
      <UButton
        color="neutral"
        variant="link"
        size="xs"
        :padded="false"
        @click="
          mode = mode === 'forgot' ? 'login' : 'forgot';
          sent = false;
        "
      >
        {{ mode === 'forgot' ? t('auth.backToSignIn') : t('auth.forgot') }}
      </UButton>

      <p class="text-right text-xs text-dimmed">
        {{ t('auth.optional') }}
      </p>
    </div>
  </form>
</template>
