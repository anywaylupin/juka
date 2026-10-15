<script setup lang="ts">
/**
 * Every preference in one place.
 *
 * Before this page they were spread over four dialogs and two menus: account settings, rating names, groups, the theme menu and the language menu.
 */
const { t } = useI18n();
useSeoMeta({ title: () => `${t('nav.settings')} · Juka` });

const session = useSession();
</script>

<template>
  <div class="max-w-3xl space-y-10">
    <h1 class="juka-heading">{{ t('nav.settings') }}</h1>

    <section class="space-y-4" aria-labelledby="settings-account">
      <h2 id="settings-account" class="juka-subheading">{{ t('settings.account') }}</h2>
      <AccountSettings v-if="session.signedIn.value" />
      <div v-else class="juka-paper max-w-lg p-5">
        <p class="mb-4 text-sm text-muted">{{ t('settings.signedOut') }}</p>
        <AuthPanel />
      </div>
    </section>

    <section class="space-y-4" aria-labelledby="settings-look">
      <h2 id="settings-look" class="juka-subheading">{{ t('settings.appearance') }}</h2>
      <div class="flex flex-wrap items-center gap-6">
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">{{ t('settings.theme') }}</span>
          <ThemePicker />
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">{{ t('settings.language') }}</span>
          <LocalePicker />
        </div>
      </div>
    </section>

    <section class="space-y-4" aria-labelledby="settings-ratings">
      <h2 id="settings-ratings" class="juka-subheading">{{ t('rating.settings') }}</h2>
      <div class="max-w-lg"><RatingSettings /></div>
    </section>

    <section class="space-y-4" aria-labelledby="settings-groups">
      <h2 id="settings-groups" class="juka-subheading">{{ t('group.manage') }}</h2>
      <p class="text-sm text-muted">{{ t('group.manageHint') }}</p>
      <div class="max-w-lg"><GroupManager /></div>
    </section>
  </div>
</template>
