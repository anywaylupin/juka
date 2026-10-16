<script setup lang="ts">
/**
 * The frame every page sits in.
 *
 * On a wide screen a narrow rail of icons sits on the left and opens over the table on hover, so the cards never move; filters and settings are a drawer from the right, closed until asked for.
 * The cards lie on a table surface between, so the box reads as something on a desk rather than a page in an app.
 * On a phone the rail folds away: a top bar and a tab bar carry the navigation, and the same drawer opens from the right.
 *
 * The box loads here, once, rather than in a page, so moving between Box, Practice and Progress never re-fetches and every page reads the same filtered list.
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

/** The sign-in reminder asks for the sign-in page through `requested`, so it never has to know where that page lives. */
watch(reminder.requested, async (value) => {
  if (value) {
    reminder.requested.value = false;
    await navigateTo(localePath('/login'));
  }
});
const { editing, editorOpen, filtersOpen, groupsOpen, bulk, stopUpdate } = useCardActions();
const { activeCount } = useCardFilters(store.cards);
const shortcutsOpen = useState('juka:shortcuts', () => false);

/** Search narrows cards, so it is offered only on the pages that show them. */
const showSearch = computed(() => !/\/(settings|reset|login)$/.test(route.path));

/** The last tab is the profile once signed in and the way in before that: a profile with no account has nothing on it that is yours. */
const tabs = computed(() => [
  { to: localePath('/'), label: t('nav.box'), icon: 'i-lucide-layout-grid', kbd: 'Z' },
  { to: localePath('/practice'), label: t('nav.practice'), icon: 'i-lucide-layers', kbd: 'X' },
  { to: localePath('/progress'), label: t('nav.progress'), icon: 'i-lucide-chart-column', kbd: 'C' },
  session.signedIn.value
    ? { to: localePath('/settings'), label: t('nav.profile'), icon: 'i-lucide-circle-user-round', kbd: 'B' }
    : { to: localePath('/login'), label: t('auth.signIn'), icon: 'i-lucide-log-in', kbd: 'B' }
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
  <div class="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[4rem_minmax(0,1fr)] lg:bg-default">
    <a href="#main" class="absolute -top-16 left-4 z-60 rounded-sm bg-default px-4 py-2 text-highlighted focus:top-4">{{
      t('nav.skip')
    }}</a>

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
      <div data-surface class="hidden lg:block" aria-hidden="true" />

      <!--
        Filters and settings hang from the frame into the table's top right corner as a tab, the way the pager rises from the bottom edge.
        Offered on the pages that show cards; the profile has nothing to filter.
      -->
      <div v-if="showSearch" data-notch class="hidden lg:flex">
        <!-- One button: both tabs live in the same drawer, so it opens on whichever was used last. -->
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-sliders-horizontal"
          aria-keyshortcuts="f"
          data-kbd="F"
          @click="filtersOpen = true"
        >
          {{ t('dock.title') }}
          <UBadge v-if="activeCount > 0" color="primary" size="sm" :label="String(activeCount)" />
        </UButton>
        <UTooltip :text="t('shortcuts.title')" :kbds="['.']">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-keyboard"
            square
            :aria-label="t('shortcuts.title')"
            data-kbd="."
            @click="shortcutsOpen = true"
          />
        </UTooltip>
      </div>

      <UMain
        id="main"
        as="main"
        tabindex="-1"
        class="relative flex w-full flex-1 flex-col px-4 pt-4 pb-20 outline-none sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:pt-2 lg:pb-16 xl:px-48"
      >
        <!--
          On a wide desktop the open sidebar reaches 11rem into the table, so the content keeps a 12rem gutter on both sides: clear of it, and still centered.
          Below that the gutter would squeeze four cards to a stamp, so it narrows and the open sidebar briefly covers the first column instead.
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
      <div
        v-if="!store.loaded.value && !store.failed.value"
        class="h-full animate-sweep bg-linear-to-r from-transparent via-primary to-transparent"
      />
    </div>

    <!--
      A dictionary update in progress, on screen with its count and a way to stop.
      It sits above the phone tab bar and stays put while you move between pages.
    -->
    <div
      v-if="bulk.running"
      class="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-default px-4 py-3 juka-ink-shadow lg:bottom-6"
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

    <!-- Phone and tablet tab bar, centered, with the pager rising out of its top edge on the Box. The sidebar carries the same links on a wide screen. -->
    <UNavigationMenu
      :items="tabs"
      color="neutral"
      :aria-label="t('nav.main')"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-default pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
      :ui="{
        root: 'justify-center',
        list: 'flex w-fit gap-1',
        link: 'min-h-14 min-w-18 flex-col justify-center gap-0.5 text-xs',
        linkLeadingIcon: 'size-5'
      }"
    />

    <AppShortcuts />

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

<style scoped>
@media (min-width: 64rem) {
  /*
    The table the cards lie on: the ink wash page, sunk a little below the frame with an inner shadow, the way the inside of a card box sits below its rim.
    When the sidebar opens, its rounded edge slides right with it.
  */
  [data-surface] {
    position: absolute;
    inset: 0.75rem 0.75rem 0.75rem 0;
    border-radius: 0.75rem;
    background: var(--juka-page);
    box-shadow:
      inset 0 0 0 1px color-mix(in oklab, var(--ui-text) 8%, transparent),
      inset 0 2px 14px -4px color-mix(in oklab, var(--ui-text) 16%, transparent);
    transition: left 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  :has([data-rail][data-expanded]) [data-surface] {
    left: 11rem;
  }

  /* Filters and settings, as a tab of frame hanging into the table's top right corner, curved where it meets the table the way the pager is at the bottom. */
  [data-notch] {
    position: fixed;
    top: 0;
    right: 2.25rem;
    z-index: 30;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0.5rem 0.4rem;
    border-radius: 0 0 0.75rem 0.75rem;
    background: var(--ui-bg);
  }
  [data-notch]::before,
  [data-notch]::after {
    content: '';
    position: absolute;
    top: 0.75rem;
    width: 0.75rem;
    height: 0.75rem;
  }
  [data-notch]::before {
    left: -0.75rem;
    background: radial-gradient(circle at 0 100%, transparent 0.75rem, var(--ui-bg) calc(0.75rem + 0.5px));
  }
  [data-notch]::after {
    right: -0.75rem;
    background: radial-gradient(circle at 100% 100%, transparent 0.75rem, var(--ui-bg) calc(0.75rem + 0.5px));
  }
}
</style>
