import type { Rating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';

/** Progress of a dictionary update over many cards, shown in the layout while it runs. */
export interface BulkUpdate {
  running: boolean;
  done: number;
  total: number;
  updated: number;
  stopping: boolean;
}

/**
 * What every page can do to a card, in one place.
 *
 * The box and the practice deck both edit, rate and delete, and the layout owns the dialogs that do it, so the handlers live here rather than being copied into each page.
 */
export function useCardActions() {
  const { t } = useI18n();
  const toast = useToast();
  const store = useCardStore();
  const { define } = useDictionary();

  const editing = useState<CardRecord | null>('juka:editing', () => null);
  const editorOpen = useState('juka:editor-open', () => false);
  const filtersOpen = useState('juka:filters-open', () => false);
  const groupsOpen = useState('juka:groups-open', () => false);
  const bulk = useState<BulkUpdate>('juka:bulk', () => ({
    running: false,
    done: 0,
    total: 0,
    updated: 0,
    stopping: false
  }));

  function openEditor(card: CardRecord | null = null) {
    editing.value = card;
    editorOpen.value = true;
  }

  async function rate(card: CardRecord, rating: Rating) {
    try {
      await store.update(card.id, { rating });
    } catch {
      toast.add({ title: t('card.notSaved'), icon: 'i-lucide-triangle-alert', color: 'error' });
    }
  }

  /** Deleting offers the card straight back, because this is the one destructive action and a misplaced tap should cost nothing. */
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

  /**
   * Looks every given card up in the dictionary again and rewrites its reading, meaning, Vietnamese and word type.
   *
   * One request per card, in order, with the count on screen and a way to stop, because on an account this is one write per card and a box of a few hundred takes a while.
   * It used to run behind a spinner in the filter drawer, which said nothing about how far it had got.
   */
  async function updateFromDictionary(list: CardRecord[]) {
    bulk.value = { running: true, done: 0, total: list.length, updated: 0, stopping: false };

    try {
      for (const card of list) {
        if (bulk.value.stopping) {
          break;
        }
        const entry = await define(card.hanzi);
        if (entry) {
          await store.update(card.id, {
            pinyin: entry.pinyin,
            translation: entry.gloss,
            translationVi: entry.vi,
            pos: entry.pos
          });
          bulk.value.updated += 1;
        }
        bulk.value.done += 1;
      }
      toast.add({
        title: t('bulk.finished', { updated: bulk.value.updated, total: bulk.value.total }),
        icon: 'i-lucide-check',
        color: 'success'
      });
    } catch {
      toast.add({
        title: t('card.notSaved'),
        description: t('bulk.finished', { updated: bulk.value.updated, total: bulk.value.total }),
        icon: 'i-lucide-triangle-alert',
        color: 'error'
      });
    } finally {
      bulk.value.running = false;
    }
  }

  function stopUpdate() {
    bulk.value.stopping = true;
  }

  return {
    editing,
    editorOpen,
    filtersOpen,
    groupsOpen,
    bulk,
    openEditor,
    rate,
    remove,
    updateFromDictionary,
    stopUpdate
  };
}
