<script setup lang="ts">
import type { Rating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';
import type { FlipMode } from '~/composables/useFlipMode';

/**
 * The whole box, laid out on the table.
 *
 * This replaced an edge-on deck where cards stood on their spines.
 * The deck looked like a card box and was miserable to read: a vertical word in a 44px spine tells you almost nothing, and finding a card meant scrubbing sideways through every other one.
 *
 * Paged rather than infinite, because a page is a place you can come back to.
 */
const props = defineProps<{
  cards: CardRecord[];
  page: number;
  pageSize: number;
  flipMode: FlipMode;
}>();

const emit = defineEmits<{
  'update:page': [value: number];
  'edit': [card: CardRecord];
  'remove': [card: CardRecord];
  'rate': [card: CardRecord, value: Rating];
}>();

const { t } = useI18n();

const pageCount = computed(() => Math.max(1, Math.ceil(props.cards.length / props.pageSize)));

const visible = computed(() => {
  const start = (props.page - 1) * props.pageSize;
  return props.cards.slice(start, start + props.pageSize);
});

/**
 * Which cards are face up.
 *
 * In `single` mode this holds at most one id, so turning a card turns the last one back: the point of testing yourself is that the others stay hidden.
 * In `all` mode it holds as many as you like.
 */
const turned = ref<Set<number>>(new Set());

/*
 * Turning a card back is something the reader does, not something the app does behind them.
 *
 * This used to watch `props.cards` and clear the whole set whenever it changed, and that array is rebuilt on every store write.
 * So rating one card, or editing one, turned every face-up card back over: in `all` mode you could not keep two cards open long enough to compare them.
 * Now only a page turn or a change of mode clears it, and ids that have left the box are pruned rather than the set being emptied.
 */
watch([() => props.page, () => props.flipMode], () => {
  turned.value = new Set();
});

watch(
  () => props.cards,
  (list) => {
    if (turned.value.size === 0) {
      return;
    }

    const present = new Set(list.map((card) => card.id));
    const next = new Set([...turned.value].filter((id) => present.has(id)));

    if (next.size !== turned.value.size) {
      turned.value = next;
    }
  }
);

function isFlipped(card: CardRecord) {
  return turned.value.has(card.id);
}

function setFlipped(card: CardRecord, value: boolean) {
  const next = props.flipMode === 'single' ? new Set<number>() : new Set(turned.value);

  if (value) {
    next.add(card.id);
  } else {
    next.delete(card.id);
  }

  turned.value = next;
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-6 lg:min-h-0">
    <TransitionGroup
      tag="div"
      name="juka-card"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-4 xl:grid-cols-4 xl:grid-rows-3"
    >
      <!--
        Each card sits in a slot sized by the grid row, and is as large as fits it, so a page of three rows always fits the table above the pager with nothing to scroll.
      -->
      <div v-for="(card, position) in visible" :key="card.id" data-gallery-cell>
        <CardFace
          :card="card"
          :flipped="isFlipped(card)"
          size="md"
          :style="{ '--juka-stagger': `${Math.min(position, 11) * 18}ms` }"
          @update:flipped="setFlipped(card, $event)"
          @edit="emit('edit', card)"
          @remove="emit('remove', card)"
          @rate="emit('rate', card, $event)"
        />
      </div>
    </TransitionGroup>

    <!--
      UPagination carries its own previous and next arrows, so there are no extra ones around it.
      On a wide screen it rises out of the frame into the bottom edge of the table as a tab, curved where it meets the table, so it is part of the border rather than a bar or a sheet over the cards; on a phone it sticks above the tab bar.
      Pages are ink chops and the current one is the red seal.
      The count of the box leads, written as a Chinese book would, 共295张, in the same hand as the cards; a screen reader hears it in the interface language.
      A page number beside it repeated what the red seal already says.
    -->
    <nav
      v-if="cards.length > 0"
      data-pager
      class="mx-auto mt-auto flex w-fit items-center gap-2"
      :aria-label="t('cards.pagination')"
    >
      <span
        class="font-hanzi text-xs text-muted tabular-nums sm:text-sm"
        lang="zh"
        :aria-label="t('cards.count', cards.length)"
        >共 {{ cards.length }} 张</span
      >
      <UPagination
        v-if="pageCount > 1"
        :page="page"
        :total="cards.length"
        :items-per-page="pageSize"
        :sibling-count="1"
        size="sm"
        :ui="{ first: 'max-sm:hidden', last: 'max-sm:hidden' }"
        color="neutral"
        variant="outline"
        active-color="neutral"
        active-variant="solid"
        @update:page="emit('update:page', $event)"
      />
    </nav>
  </div>
</template>

<style scoped>
/* The pager on a phone: a small sheet of paper stuck above the tab bar. The current page is the red seal; the rest stay ink chops. */
[data-pager] {
  padding: 0.4rem 0.75rem;
  border-radius: 0.6rem;
  background: color-mix(in oklab, var(--ui-bg) 90%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--ui-text) 8%, transparent),
    0 10px 24px -12px color-mix(in oklab, var(--ui-text) 30%, transparent);
  backdrop-filter: blur(6px);
}
[data-pager] :deep([aria-current='page']) {
  background: linear-gradient(180deg, color-mix(in oklab, var(--juka-seal) 92%, white), var(--juka-seal));
  color: #fff8f0;
  box-shadow:
    inset 0 0 0 2.5px var(--juka-seal),
    inset 0 0 0 3.5px rgb(255 248 240 / 0.55);
}

@media (min-width: 64rem) {
  /*
    A gallery cell is a size container, and the card in it takes the largest 5 by 3.2 box that fits, so the grid's rows decide the card size and a page never overflows the table.
    A cell on its way out gives up its place at once, or the next page would land in a fourth row.
  */
  [data-gallery-cell] {
    container-type: size;
    display: grid;
    place-items: center;
    min-height: 0;
  }
  [data-gallery-cell].juka-card-leave-active {
    display: none;
  }
  [data-gallery-cell] > .group {
    width: min(100cqw, 100cqh * 5 / 3.2);
    max-width: none;
  }

  /*
    On a wide screen the pager is a tab of frame rising into the table's bottom edge: the frame's own color with rounded top corners, and two small squares beside it filled with frame except for a quarter circle, so the corners curve outward the way the sidebar meets the table.
  */
  [data-pager] {
    position: fixed;
    bottom: 0;
    left: calc(50% + 1.625rem);
    z-index: 30;
    gap: 0.25rem;
    padding: 0.5rem 1rem 0.75rem;
    border-radius: 0.75rem 0.75rem 0 0;
    background: var(--ui-bg);
    box-shadow: none;
    backdrop-filter: none;
    transform: translateX(-50%);
  }
  [data-pager]::before,
  [data-pager]::after {
    content: '';
    position: absolute;
    bottom: 0.75rem;
    width: 0.75rem;
    height: 0.75rem;
  }
  [data-pager]::before {
    left: -0.75rem;
    background: radial-gradient(circle at 0 0, transparent 0.75rem, var(--ui-bg) calc(0.75rem + 0.5px));
  }
  [data-pager]::after {
    right: -0.75rem;
    background: radial-gradient(circle at 100% 0, transparent 0.75rem, var(--ui-bg) calc(0.75rem + 0.5px));
  }
}
/*
  On a phone and a tablet the pager rises out of the tab bar's top edge the same way it rises out of the frame on a desktop: the bar's own color, rounded on top, with curved corners where it meets the bar.
*/
@media (max-width: 63.999rem) {
  [data-pager] {
    position: fixed;
    /* The tab bar is 4.5rem tall (its 3.5rem links plus padding), so the pager sits on its top edge and covers its border. */
    bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    left: 50%;
    z-index: 35;
    padding: 0.35rem 0.6rem 0.25rem;
    border-radius: 0.75rem 0.75rem 0 0;
    background: var(--ui-bg);
    box-shadow: 0 -1px 0 var(--ui-border);
    backdrop-filter: none;
    transform: translateX(-50%);
  }
  [data-pager]::before,
  [data-pager]::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: 0.75rem;
    height: 0.75rem;
  }
  [data-pager]::before {
    left: -0.75rem;
    background: radial-gradient(circle at 0 0, transparent 0.75rem, var(--ui-bg) calc(0.75rem + 0.5px));
  }
  [data-pager]::after {
    right: -0.75rem;
    background: radial-gradient(circle at 100% 0, transparent 0.75rem, var(--ui-bg) calc(0.75rem + 0.5px));
  }
}
</style>
