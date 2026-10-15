<script setup lang="ts">
/**
 * The profile: what you own rather than how it is shown.
 *
 * The account on the left, the names of your rating levels and your groups on the right.
 * Theme, language and how cards turn are in the settings tab of the dock, beside the cards they change.
 */
const { t } = useI18n();
useSeoMeta({ title: () => `${t('nav.profile')} · Juka` });

const localePath = useLocalePath();
const session = useSession();
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8">
    <div class="flex items-center gap-4">
      <span class="juka-seal size-14 text-3xl uppercase" aria-hidden="true">
        {{ session.account.value?.username?.[0] ?? '橘' }}
      </span>
      <div class="min-w-0">
        <h1 class="juka-heading">{{ session.account.value?.username ?? t('nav.profile') }}</h1>
        <p class="truncate text-sm text-muted">{{ session.account.value?.email ?? t('settings.signedOut') }}</p>
      </div>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-2">
      <section class="juka-paper space-y-4 p-6" aria-labelledby="profile-account">
        <h2 id="profile-account" class="juka-subheading">{{ t('settings.account') }}</h2>
        <AccountSettings v-if="session.signedIn.value" />
        <div v-else class="space-y-4">
          <p class="text-sm text-muted">{{ t('auth.optional') }}</p>
          <UButton :to="localePath('/login')" class="juka-seal-button" icon="i-lucide-log-in" size="lg">
            {{ t('auth.signIn') }}
          </UButton>
        </div>
      </section>

      <div class="space-y-6">
        <section class="juka-paper space-y-4 p-6" aria-labelledby="profile-ratings">
          <h2 id="profile-ratings" class="juka-subheading">{{ t('rating.settings') }}</h2>
          <RatingSettings />
        </section>

        <section class="juka-paper space-y-4 p-6" aria-labelledby="profile-groups">
          <div>
            <h2 id="profile-groups" class="juka-subheading">{{ t('group.manage') }}</h2>
            <p class="text-sm text-muted">{{ t('group.manageHint') }}</p>
          </div>
          <GroupManager />
        </section>
      </div>
    </div>
  </div>
</template>
