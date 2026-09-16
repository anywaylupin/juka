<script setup lang="ts">
import { loginSchema, registerSchema } from '#shared/schemas/auth';

/**
 * Signing in, signing up, and the one decision that matters either way: what to
 * do with the cards already in this browser.
 *
 * An account is optional. The offer is storage that survives a cleared browser
 * and reaches a second device, not a gate, and the copy says so rather than
 * implying the app needs one.
 */
const emit = defineEmits<{ done: [] }>();

const { t } = useI18n();
const toast = useToast();
const session = useSession();
const store = useCardStore();

const tab = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const email = ref('');
const busy = ref(false);

/** Cards sitting in local storage right now, which signing in can copy up. */
const pending = computed(() => store.localCards().length);
const bringLocal = ref(true);

const tabs = computed(() => [
  { label: t('auth.signIn'), value: 'login' as const },
  { label: t('auth.createAccount'), value: 'register' as const }
]);

async function submit() {
  const schema = tab.value === 'login' ? loginSchema : registerSchema;
  const parsed = schema.safeParse({
    username: username.value,
    password: password.value,
    ...(tab.value === 'register' ? { email: email.value } : {})
  });

  if (!parsed.success) {
    toast.add({
      title: parsed.error.issues[0]?.message ?? t('auth.checkDetails'),
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    });
    return;
  }

  // Read before signing in: the store swaps to the account the moment the
  // session lands, and the local list is no longer what is in memory.
  const local = store.localCards();

  busy.value = true;
  try {
    if (tab.value === 'login') {
      await session.login({ username: username.value, password: password.value });
    } else {
      await session.register({
        username: username.value,
        password: password.value,
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
      toast.add({ title: t('auth.welcome', { username: username.value }), icon: 'i-lucide-check', color: 'success' });
    }

    emit('done');
  } catch (error) {
    const message =
      (error as { data?: { message?: string } })?.data?.message ?? (error instanceof Error ? error.message : undefined);

    toast.add({ title: t('auth.failed'), description: message, icon: 'i-lucide-triangle-alert', color: 'error' });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <UTabs v-model="tab" :items="tabs" :content="false" size="sm" />

    <UFormField :label="t('auth.username')">
      <UInput
        v-model="username"
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
        :autocomplete="tab === 'login' ? 'current-password' : 'new-password'"
        class="w-full"
        icon="i-lucide-lock"
      />
    </UFormField>

    <UFormField v-if="tab === 'register'" :label="t('auth.email')" :help="t('auth.emailHelp')">
      <UInput v-model="email" type="email" autocomplete="email" class="w-full" icon="i-lucide-mail" />
    </UFormField>

    <!--
      Offered, not assumed, and worded so it is clear nothing is moved. The
      local copy stays exactly where it is either way, which is what makes
      signing out safe.
    -->
    <UAlert
      v-if="pending > 0"
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
      {{ tab === 'login' ? t('auth.signIn') : t('auth.createAccount') }}
    </UButton>

    <p class="text-center text-xs text-dimmed">
      {{ t('auth.optional') }}
    </p>
  </form>
</template>
