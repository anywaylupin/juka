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
      class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-4 lg:grid-rows-3"
    >
      <!--
        Each card sits in a slot sized by the grid row, and is as large as fits it, so a page of three rows always fits the table above the pager with nothing to scroll.
      -->
      <div v-for="(card, position) in visible" :key="card.id" class="juka-slot">
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
      Pages are ink chops and the current one is the red seal, with the page written the way a Chinese book numbers it beside them.
    -->
    <nav
      v-if="cards.length > 0"
      class="juka-pages juka-notch-bottom sticky bottom-20 z-20 mx-auto mt-auto flex w-fit items-center gap-3"
      :aria-label="t('cards.pagination')"
    >
      <UPagination
        v-if="pageCount > 1"
        :page="page"
        :total="cards.length"
        :items-per-page="pageSize"
        :sibling-count="1"
        color="neutral"
        variant="outline"
        active-color="neutral"
        active-variant="solid"
        @update:page="emit('update:page', $event)"
      />
      <span v-if="pageCount > 1" class="font-hanzi text-sm text-muted" lang="zh" aria-hidden="true"
        >第{{ page }}页</span
      >
      <span class="text-sm text-muted tabular-nums">{{ t('cards.count', cards.length) }}</span>
    </nav>
  </div>
</template>
