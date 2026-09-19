<script setup lang="ts">
import { passwordResetSchema } from '#shared/schemas/auth';

/**
 * The page a reset link lands on.
 *
 * It is a page rather than a dialog because it is opened from an email, cold, with no app state behind it, and because the token belongs in a URL that can be closed and reopened.
 * Setting the password signs the person in, so this ends at the cards rather than at a login form.
 */
definePageMeta({ name: 'reset' });

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const session = useSession();

const token = computed(() => String(route.query.token ?? ''));
const password = ref('');
const confirmPassword = ref('');
const busy = ref(false);

async function submit() {
  const parsed = passwordResetSchema.safeParse({
    token: token.value,
    password: password.value,
    confirmPassword: confirmPassword.value
  });

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
    await session.resetPassword({
      token: token.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    });

    toast.add({
      title: t('auth.resetDone'),
      description: t('auth.welcome', { username: session.account.value?.username ?? '' }),
      icon: 'i-lucide-check',
      color: 'success'
    });

    await router.replace(localePath('/'));
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
  <div class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
    <div class="rounded-2xl bg-default p-6 ring ring-default">
      <h1 class="text-xl font-semibold text-highlighted">
        {{ t('auth.resetTitle') }}
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ t('auth.resetHint') }}
      </p>

      <UAlert
        v-if="!token"
        class="mt-5"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="t('auth.resetNoToken')"
        :description="t('auth.resetNoTokenHint')"
      />

      <form v-else class="mt-5 space-y-4" @submit.prevent="submit">
        <UFormField :label="t('account.newPassword')">
          <UInput
            v-model="password"
            type="password"
            autocomplete="new-password"
            autofocus
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

        <UButton type="submit" :loading="busy" color="primary" size="lg" block>
          {{ t('auth.resetSubmit') }}
        </UButton>
      </form>

      <UButton class="mt-4" color="neutral" variant="link" size="xs" :to="localePath('/')">
        {{ t('auth.backToCards') }}
      </UButton>
    </div>
  </div>
</template>
