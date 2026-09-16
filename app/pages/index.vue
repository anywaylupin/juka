<script setup lang="ts">
import type { Rating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';
import type { BoxView } from '~/composables/useBoxView';

definePageMeta({ name: 'cards' });

const { t } = useI18n();
const toast = useToast();

useSeoMeta({
  title: 'Juka',
  description: () => t('tagline')
});

const session = useSession();
const store = useCardStore();
const groupStore = useGroups();
const view = useBoxView();
const flipMode = useFlipMode();

const { filters, results, activeCount, toggle, clearGroup, clearAll } = useCardFilters(store.cards);

/*
 * The views sit in a row in the top bar, so switching between them moves along
 * that row rather than cross fading in place. The direction comes from the
 * order of the icons: picking one further right slides the new view in from
 * the right.
 */
const VIEW_ORDER: BoxView[] = ['gallery', 'stack', 'chart'];
const viewTransition = ref('juka-view-left');

watch(view, (next, previous) => {
  viewTransition.value = VIEW_ORDER.indexOf(next) > VIEW_ORDER.indexOf(previous) ? 'juka-view-left' : 'juka-view-right';
});

/*
 * Everything loads on the client. Local storage is not readable on the server,
 * and an account's cards would only have to be re-read once the session cookie
 * resolves, so there is one load path rather than two.
 */
const reminder = useSignInReminder();

onMounted(async () => {
  await session.refresh();
  await Promise.all([store.load(), groupStore.load()]);
  // Scheduled after the box is known, so the wording can count the cards at
  // risk rather than guessing.
  reminder.schedule();
});

/* The gallery pages; the stack walks. Both reset when the list changes. */
const page = ref(1);
const index = ref(0);
const PAGE_SIZE = 12;

/**
 * Practice order, weighted toward the cards you know least.
 *
 * Only the stack reads it. The gallery stays in the order the box is in,
 * because a page you can come back to has to be the same page next time.
 */
const practice = useCookie<boolean>('juka_practice', { default: () => true, sameSite: 'lax' });
const { ordered, reshuffle } = usePracticeOrder(
  results,
  computed(() => view.value === 'stack' && practice.value)
);

watch(results, (list) => {
  page.value = 1;
  if (index.value >= list.length) {
    index.value = Math.max(0, list.length - 1);
  }
});

/* Search, debounced so filtering does not run on every keystroke. */
const search = ref(filters.value.q);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(search, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    filters.value = { ...filters.value, q: value };
  }, 180);
});

onBeforeUnmount(() => clearTimeout(timer));

/* Panels */
const filtersOpen = ref(false);
const editorOpen = ref(false);
const groupsOpen = ref(false);
const editing = ref<CardRecord | null>(null);

function openEditor(card: CardRecord | null = null) {
  editing.value = card;
  editorOpen.value = true;
}

function onSaved() {
  editorOpen.value = false;
  editing.value = null;
}

async function rate(card: CardRecord, rating: Rating) {
  try {
    await store.update(card.id, { rating });
  } catch {
    toast.add({ title: t('card.notSaved'), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}

/**
 * Deleting a card offers it straight back, because this is the only destructive
 * action in the app and a misplaced click should cost nothing.
 */
async function remove(card: CardRecord) {
  try {
    await store.remove(card.id);
    toast.add({
      title: t('card.deleted'),
      icon: 'i-lucide-trash-2',
      actions: [
        {
          label: t('common.undo'),
          color: 'neutral',
          variant: 'outline',
          onClick: async () => {
            try {
              await store.restore(card);
            } catch {
              toast.add({ title: t('card.notRestored'), icon: 'i-lucide-triangle-alert', color: 'error' });
            }
          }
        }
      ]
    });
  } catch {
    toast.add({ title: t('card.notDeleted'), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}
</script>

<template>
  <div>
    <AppHeader
      v-model:view="view"
      v-model:search="search"
      v-model:flip-mode="flipMode"
      :filter-count="activeCount"
      :matches="results.length"
      @open-filters="filtersOpen = true"
      @add="openEditor()"
    />

    <!--
      The loading bar sits under the top bar rather than in the page, so nothing
      moves when it goes. It is indeterminate on purpose: local storage and a
      keyset page both finish too fast to measure, and a bar that jumps straight
      to full is a worse lie than one that simply moves.
    -->
    <div
      class="sticky top-14 z-30 h-0.5 overflow-hidden"
      role="status"
      :aria-label="store.loaded.value ? '' : t('cards.loading')"
    >
      <div v-if="!store.loaded.value && !store.failed.value" class="juka-loading-bar h-full" />
    </div>

    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <!--
        Failure, waiting and an empty box sit outside the view transition on
        purpose. They are not views, sliding a skeleton grid sideways says
        nothing, and putting them inside meant the cards could not appear until
        an animation had finished: `out-in` holds the incoming content back
        until the outgoing leave ends, and a tab that is not being painted
        never ends one.
      -->
      <UAlert
        v-if="store.failed.value"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="t('cards.failed')"
        :description="t('cards.failedHint')"
        :actions="[{ label: t('common.retry'), color: 'error', variant: 'soft', onClick: () => store.load() }]"
      />

      <!--
        Skeletons in the shape of the thing that is coming, not grey boxes of
        some other size, so the page does not jump when the cards land.
      -->
      <div v-else-if="!store.loaded.value" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div
          v-for="placeholder in 8"
          :key="placeholder"
          class="juka-skeleton-card rounded-2xl"
          :style="{ '--juka-stagger': `${placeholder * 90}ms` }"
        />
      </div>

      <div
        v-else-if="results.length === 0"
        class="mx-auto max-w-md rounded-2xl bg-default p-10 text-center ring ring-default"
      >
        <p class="font-hanzi text-5xl text-muted"> 空 </p>
        <p class="mt-3 font-semibold text-highlighted">
          {{ activeCount > 0 ? t('cards.noMatches') : t('cards.empty') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ activeCount > 0 ? t('cards.noMatchesHint') : t('cards.emptyHint') }}
        </p>
        <UButton
          v-if="activeCount > 0"
          class="mt-5"
          color="neutral"
          variant="soft"
          icon="i-lucide-filter-x"
          @click="clearAll"
        >
          {{ t('filter.clearAll') }}
        </UButton>
        <UButton v-else class="mt-5" color="primary" size="lg" icon="i-lucide-plus" @click="openEditor()">
          {{ t('card.add') }}
        </UButton>
      </div>

      <!--
        The three views, and only the three views. They sit in a row in the top
        bar, so moving between them slides along that row.
      -->
      <Transition v-else :name="viewTransition" mode="out-in">
        <CardGallery
          v-if="view === 'gallery'"
          key="gallery"
          v-model:page="page"
          :cards="results"
          :page-size="PAGE_SIZE"
          :flip-mode="flipMode"
          @edit="openEditor"
          @remove="remove"
          @rate="rate"
        />

        <CardStack
          v-else-if="view === 'stack'"
          key="stack"
          v-model="index"
          v-model:practice="practice"
          :cards="ordered"
          @reshuffle="reshuffle"
          @edit="openEditor"
          @remove="remove"
          @rate="rate"
        />

        <CardChart v-else key="chart" :cards="results" :groups="groupStore.groups.value" />
      </Transition>
    </main>

    <USlideover v-model:open="filtersOpen" :title="t('filter.title')" side="right">
      <template #body>
        <FilterDrawer
          :filters="filters"
          :cards="store.cards.value"
          :groups="groupStore.groups.value"
          @toggle-rating="toggle('ratings', $event)"
          @toggle-part="toggle('parts', $event)"
          @toggle-length="toggle('lengths', $event)"
          @toggle-group="toggle('groups', $event)"
          @clear-group="clearGroup"
          @clear-all="clearAll"
          @manage-groups="groupsOpen = true"
        />
      </template>
    </USlideover>

    <UModal v-model:open="groupsOpen" :title="t('group.manage')" :description="t('group.manageHint')">
      <template #body>
        <GroupManager />
      </template>
    </UModal>

    <UModal
      v-model:open="editorOpen"
      :title="editing ? t('card.edit') : t('card.add')"
      :description="editing ? undefined : t('card.addHint')"
    >
      <template #body>
        <CardEditor :card="editing" @saved="onSaved" @cancel="editorOpen = false" />
      </template>
    </UModal>
  </div>
</template>
