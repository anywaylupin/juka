import type { GroupRecord } from '#shared/types/card';

/**
 * The user's groups, wherever the box happens to be.
 *
 * Same shape as useCardStore and for the same reason: signed out they live in
 * local storage, signed in they live on the account, and nothing else in the
 * app has to know which.
 *
 * Counts are computed here rather than trusted from the server, because the
 * card list is already in memory and a local box has no server to ask.
 */

const STORAGE_KEY = 'juka.groups';
const STORAGE_SEQUENCE = 'juka.groups.seq';

/** Offered when creating a group, so a new one is never the same grey. */
export const GROUP_COLOURS = ['#e35205', '#2f6fd0', '#2e9153', '#6b5bd2', '#e0596b', '#0e8f9e', '#d99e00', '#8c7f76'];

function readLocal(): GroupRecord[] {
  if (import.meta.server) {
    return [];
  }

  try {
    // Normalised for the same reason the cards are: see shared/utils/normalise.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normaliseGroups(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function writeLocal(items: GroupRecord[]) {
  if (import.meta.server) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota or a blocked store; the session copy is still correct */
  }
}

/** Local ids are negative, so they can never collide with an account's. */
function nextLocalId(): number {
  if (import.meta.server) {
    return -1;
  }

  const current = Number(window.localStorage.getItem(STORAGE_SEQUENCE) ?? '0');
  const next = (Number.isFinite(current) ? current : 0) + 1;

  try {
    window.localStorage.setItem(STORAGE_SEQUENCE, String(next));
  } catch {
    /* see writeLocal */
  }

  return -next;
}

export function useGroups() {
  const { account, signedIn } = useSession();
  const store = useCardStore();

  const groups = useState<GroupRecord[]>('juka:groups', () => []);

  async function load() {
    if (!signedIn.value) {
      groups.value = readLocal();
      return;
    }

    try {
      const { items } = await $fetch<{ items: GroupRecord[] }>('/api/groups');
      groups.value = items;
    } catch {
      // A box with no groups is usable. A crash is not.
      groups.value = [];
    }
  }

  watch(
    () => account.value?.id ?? null,
    () => {
      if (import.meta.client) {
        load();
      }
    }
  );

  /**
   * Groups with a live count taken from the cards in memory.
   *
   * The server sends a count too, but it goes stale the moment a card is filed,
   * and a local box never had one. Counting what is already loaded is both
   * cheaper and more correct.
   */
  const withCounts = computed<GroupRecord[]>(() => {
    const counts = new Map<number, number>();

    for (const card of store.cards.value) {
      for (const id of card.groupIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    return groups.value.map((group) => ({ ...group, count: counts.get(group.id) ?? 0 }));
  });

  function byId(id: number): GroupRecord | undefined {
    return groups.value.find((group) => group.id === id);
  }

  async function add(input: { name: string; colour: string }): Promise<GroupRecord> {
    const name = input.name.trim();

    if (groups.value.some((group) => group.name === name)) {
      throw createError({ statusCode: 409, message: `You already have a group called ${name}` });
    }

    if (signedIn.value) {
      const created = await $fetch<GroupRecord>('/api/groups', {
        method: 'POST',
        body: { name, colour: input.colour }
      });
      groups.value = [...groups.value, created];
      return created;
    }

    const created: GroupRecord = {
      id: nextLocalId(),
      name,
      colour: input.colour,
      orderIndex: groups.value.length
    };

    groups.value = [...groups.value, created];
    writeLocal(groups.value);

    return created;
  }

  async function update(id: number, changes: { name?: string; colour?: string }): Promise<void> {
    if (changes.name && groups.value.some((group) => group.name === changes.name && group.id !== id)) {
      throw createError({ statusCode: 409, message: `You already have a group called ${changes.name}` });
    }

    if (signedIn.value) {
      const saved = await $fetch<GroupRecord>(`/api/groups/${id}`, { method: 'PATCH', body: changes });
      groups.value = groups.value.map((group) => (group.id === id ? { ...group, ...saved } : group));
      return;
    }

    groups.value = groups.value.map((group) => (group.id === id ? { ...group, ...changes } : group));
    writeLocal(groups.value);
  }

  /**
   * Removing a group is removing a label, never a card. The join table cascades
   * on the server; locally the ids are stripped from every card by hand.
   */
  async function remove(id: number): Promise<void> {
    if (signedIn.value) {
      await $fetch(`/api/groups/${id}`, { method: 'DELETE' });
      groups.value = groups.value.filter((group) => group.id !== id);
      await store.load();
      return;
    }

    groups.value = groups.value.filter((group) => group.id !== id);
    writeLocal(groups.value);
    await store.dropGroup(id);
  }

  return { groups: withCounts, load, byId, add, update, remove };
}
