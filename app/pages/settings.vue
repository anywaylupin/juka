<script setup lang="ts">
/**
 * The profile: what you own rather than how it is shown.
 *
 * Three sections across the table, each the same paper as Progress, so the page fits a desktop screen without scrolling: the account, the names of your rating levels, and your groups.
 * It exists only for someone signed in: the navigation offers Sign in in its place, and a signed out visit here goes to the sign-in page.
 * Theme, language and how cards turn are in the settings tab of the dock, beside the cards they change.
 */
const { t } = useI18n();
useSeoMeta({ title: () => `${t('nav.profile')} · Juka` });

const localePath = useLocalePath();
const session = useSession();
watch(
  () => [session.ready.value, session.signedIn.value] as const,
  ([ready, signedIn]) => {
    if (ready && !signedIn) {
      navigateTo(localePath('/login'), { replace: true });
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col gap-4 xl:h-full xl:min-h-0">
    <PageTitle class="max-lg:hidden" glyph="我" :title="t('nav.profile')" />

    <div class="grid gap-4 md:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3">
      <UCard as="section" :ui="JUKA_SECTION" aria-labelledby="profile-account">
        <h2 id="profile-account" class="shrink-0 juka-subheading text-base">{{ t('settings.account') }}</h2>
        <div class="juka-section-body">
          <AccountSettings v-if="session.signedIn.value" />
        </div>
      </UCard>

      <UCard as="section" :ui="JUKA_SECTION" aria-labelledby="profile-ratings">
        <div class="shrink-0">
          <h2 id="profile-ratings" class="juka-subheading text-base">{{ t('rating.settings') }}</h2>
          <p class="text-sm text-muted">{{ t('rating.settingsHint') }}</p>
        </div>
        <div class="juka-section-body"><RatingSettings /></div>
      </UCard>

      <UCard as="section" :ui="JUKA_SECTION" aria-labelledby="profile-groups">
        <div class="shrink-0">
          <h2 id="profile-groups" class="juka-subheading text-base">{{ t('group.manage') }}</h2>
          <p class="text-sm text-muted">{{ t('group.manageHint') }}</p>
        </div>
        <div class="juka-section-body"><GroupManager /></div>
      </UCard>
    </div>
  </div>
</template>
