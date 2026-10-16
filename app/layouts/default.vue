<script setup lang="ts">
/**
 * The frame every page sits in.
 *
 * On a wide screen a narrow rail of icons sits on the left and opens over the table on hover, so the cards never move; filters and settings are a drawer from the right, closed until asked for.
 * The cards lie on a table surface between, so the box reads as something on a desk rather than a page in an app.
 * On a phone the rail folds away: a top bar and a tab bar carry the navigation, and the same drawer opens from the right.
 *
 * The box loads here, once, rather than in a page, so moving between Box, Practice and Progress never refetches and every page reads the same filtered list.
 */
const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const session = useSession();
const store = useCardStore();
const groupStore = useGroups();
const reminder = useSignInReminder();
const { editing, editorOpen, filtersOpen, groupsOpen, bulk, stopUpdate } = useCardActions();
const { activeCount } = useCardFilters(store.cards);

/** Search narrows cards, so it is offered only on the pages that show them. */
const showSearch = computed(() => !/\/(settings|reset|login)$/.test(route.path));

/** The last tab is the profile once signed in and the way in before that: a profile with no account has nothing on it that is yours. */
const tabs = computed(() => [
  { to: localePath('/'), label: t('nav.box'), icon: 'i-lucide-layout-grid' },
  { to: localePath('/practice'), label: t('nav.practice'), icon: 'i-lucide-layers' },
  { to: localePath('/progress'), label: t('nav.progress'), icon: 'i-lucide-chart-column' },
  session.signedIn.value
    ? { to: localePath('/settings'), label: t('nav.profile'), icon: 'i-lucide-circle-user-round' }
    : { to: localePath('/login'), label: t('auth.signIn'), icon: 'i-lucide-log-in' }
]);

/**
 * A provider sign-in comes back with a flag on the query, because a redirect cannot resolve a promise.
 * Read once, then removed, so a reload does not say hello twice.
 */
async function greetProviderReturn() {
  const signedInWith = route.query.signedin;
  const failedWith = route.query.autherror;
  if (!signedInWith && !failedWith) {
    return;
  }
  const name = String(signedInWith ?? failedWith) === 'github' ? 'GitHub' : 'Google';
  toast.add(
    signedInWith
      ? { title: t('auth.welcomeProvider', { provider: name }), icon: 'i-lucide-check', color: 'success' }
      : { title: t('auth.providerFailed'), icon: 'i-lucide-triangle-alert', color: 'error' }
  );
  await router.replace({ query: {} });
}

onMounted(async () => {
  await session.refresh();
  await Promise.all([store.load(), groupStore.load()]);
  await greetProviderReturn();
  reminder.schedule();
});

function onSaved() {
  editorOpen.value = false;
  editing.value = null;
}
</script>

<template>
  <div class="juka-shell min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[4rem_minmax(0,1fr)] lg:bg-default">
    <a href="#main" class="juka-skip">{{ t('nav.skip') }}</a>

    <!-- The rail holds its 4rem column; the sidebar inside it widens over the table rather than pushing it. -->
    <div class="relative hidden lg:block">
      <AppSidebar :tabs="tabs" />
    </div>

    <div class="relative flex min-h-dvh flex-col lg:min-h-0 lg:py-3 lg:pr-3">
      <AppHeader :tabs="tabs" class="lg:hidden" />

      <!--
        The table is drawn as its own layer under the content, so when the sidebar opens the table's rounded edge slides right with it and the sidebar reads as part of the frame rather than a sheet over it.
        The content does not move: its gutter is wider than the slide.
      -->
      <div class="juka-table-surface hidden lg:block" aria-hidden="true" />

      <!--
        Filters and settings hang from the frame into the table's top right corner as a tab, the way the pager rises from the bottom edge.
        Offered on the pages that show cards; the profile has nothing to filter.
      -->
      <div v-if="showSearch" class="juka-notch-top hidden lg:flex">
        <!-- One button: both tabs live in the same drawer, so it opens on whichever was used last. -->
        <UButton color="neutral" variant="ghost" icon="i-lucide-sliders-horizontal" @click="filtersOpen = true">
          {{ t('dock.title') }}
          <UBadge v-if="activeCount > 0" color="primary" size="sm" :label="String(activeCount)" />
        </UButton>
      </div>

      <UMain
        id="main"
        as="main"
        tabindex="-1"
        class="juka-table relative flex w-full flex-1 flex-col px-4 pt-6 pb-28 outline-none sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:px-[12rem] lg:pt-2 lg:pb-16"
      >
        <!--
          The open sidebar reaches 10.5rem into the table, so the content keeps a 12rem gutter on both sides: clear of it with room to spare, and still centered.
          A flex column, so a page can fill it and push its pager to the foot.
        -->
        <slot />
      </UMain>
    </div>

    <!-- Waiting has a shape: an indeterminate bar while the box loads. -->
    <div
      class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
      role="status"
      :aria-label="store.loaded.value ? '' : t('cards.loading')"
    >
      <div v-if="!store.loaded.value && !store.failed.value" class="juka-loading-bar h-full" />
    </div>

    <!--
      A dictionary update in progress, on screen with its count and a way to stop.
      It sits above the phone tab bar and stays put while you move between pages.
    -->
    <div
      v-if="bulk.running"
      class="juka-ink-shadow fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-default px-4 py-3 lg:bottom-6"
      role="status"
      aria-live="polite"
    >
      <UIcon name="i-lucide-refresh-cw" class="size-5 shrink-0 animate-spin text-primary" />
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-highlighted">
          {{ t('bulk.progress', { done: bulk.done, total: bulk.total }) }}
        </p>
        <UProgress :model-value="bulk.done" :max="bulk.total" size="sm" class="mt-1" />
      </div>
      <UButton color="neutral" variant="outline" :loading="bulk.stopping" @click="stopUpdate">
        {{ t('bulk.stop') }}
      </UButton>
    </div>

    <!-- Phone tab bar. The sidebar carries the same four on wider screens. -->
    <UNavigationMenu
      :items="tabs"
      color="neutral"
      :aria-label="t('nav.main')"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
      :ui="{
        list: 'grid w-full grid-cols-4',
        link: 'min-h-14 flex-col justify-center gap-0.5 text-xs',
        linkLeadingIcon: 'size-5'
      }"
    />

    <USlideover
      v-model:open="filtersOpen"
      side="right"
      :title="t('dock.title')"
      :ui="{ ...JUKA_PANEL, body: 'flex min-h-0 flex-1 flex-col overflow-hidden p-0 sm:p-0' }"
    >
      <template #body>
        <AppDock />
      </template>
    </USlideover>

    <UModal v-model:open="groupsOpen" :ui="JUKA_PANEL" :title="t('group.manage')" :description="t('group.manageHint')">
      <template #body>
        <GroupManager />
      </template>
    </UModal>

    <UModal
      v-model:open="editorOpen"
      :ui="JUKA_PANEL"
      :title="editing ? t('card.edit') : t('card.add')"
      :description="editing ? undefined : t('card.addHint')"
    >
      <template #body>
        <CardEditor :card="editing" @saved="onSaved" @cancel="editorOpen = false" />
      </template>
    </UModal>
  </div>
</template>
