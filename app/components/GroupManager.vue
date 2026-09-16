<script setup lang="ts">
import { GROUP_COLOURS } from '~/composables/useGroups';

/**
 * Making and renaming groups.
 *
 * Deleting one removes a label, never a card.
 * That is the difference between a group and the units this replaced: a unit was a folder a card had to be in, so deleting it left cards homeless.
 * A group is a tag.
 */
const { t } = useI18n();
const toast = useToast();
const { groups, add, update, remove } = useGroups();

const name = ref('');
const colour = ref(GROUP_COLOURS[0] as string);
const busy = ref(false);

const editing = ref<number | null>(null);
const draftName = ref('');

async function create() {
  if (!name.value.trim() || busy.value) {
    return;
  }

  busy.value = true;
  try {
    await add({ name: name.value, colour: colour.value });
    name.value = '';
    // Step along the palette so two groups made in a row look different.
    const next = GROUP_COLOURS.indexOf(colour.value) + 1;
    colour.value = GROUP_COLOURS[next % GROUP_COLOURS.length] as string;
  } catch (error) {
    toast.add({ title: message(error), icon: 'i-lucide-triangle-alert', color: 'error' });
  } finally {
    busy.value = false;
  }
}

function startEdit(id: number, current: string) {
  editing.value = id;
  draftName.value = current;
}

async function commitEdit(id: number) {
  const next = draftName.value.trim();
  editing.value = null;

  if (!next) {
    return;
  }

  try {
    await update(id, { name: next });
  } catch (error) {
    toast.add({ title: message(error), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}

async function recolour(id: number, value: string) {
  try {
    await update(id, { colour: value });
  } catch (error) {
    toast.add({ title: message(error), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}

async function destroy(id: number, label: string) {
  if (!confirm(t('group.confirmDelete', { name: label }))) {
    return;
  }

  try {
    await remove(id);
  } catch (error) {
    toast.add({ title: message(error), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}

function message(error: unknown): string {
  return (
    (error as { data?: { message?: string } })?.data?.message ??
    (error instanceof Error ? error.message : t('group.notSaved'))
  );
}
</script>

<template>
  <div class="space-y-4">
    <form class="flex items-end gap-2" @submit.prevent="create">
      <UPopover>
        <UButton color="neutral" variant="outline" :aria-label="t('group.colour')">
          <span class="size-4 rounded-full" :style="{ backgroundColor: colour }" />
        </UButton>
        <template #content>
          <div class="grid grid-cols-4 gap-1 p-2">
            <button
              v-for="option in GROUP_COLOURS"
              :key="option"
              type="button"
              class="size-7 rounded-full"
              :style="{ backgroundColor: option }"
              :aria-label="option"
              @click="colour = option"
            />
          </div>
        </template>
      </UPopover>

      <UInput v-model="name" class="flex-1" :placeholder="t('group.namePlaceholder')" :aria-label="t('group.name')" />

      <UButton
        type="submit"
        color="primary"
        icon="i-lucide-plus"
        :loading="busy"
        :disabled="!name.trim()"
        :aria-label="t('group.add')"
      />
    </form>

    <p v-if="groups.length === 0" class="text-sm text-muted">
      {{ t('group.emptyHint') }}
    </p>

    <ul v-else class="space-y-1">
      <li v-for="group in groups" :key="group.id" class="flex items-center gap-2 rounded-lg px-1 py-1.5">
        <UPopover>
          <button
            type="button"
            class="size-4 shrink-0 rounded-full"
            :style="{ backgroundColor: group.colour }"
            :aria-label="t('group.colour')"
          />
          <template #content>
            <div class="grid grid-cols-4 gap-1 p-2">
              <button
                v-for="option in GROUP_COLOURS"
                :key="option"
                type="button"
                class="size-7 rounded-full"
                :style="{ backgroundColor: option }"
                :aria-label="option"
                @click="recolour(group.id, option)"
              />
            </div>
          </template>
        </UPopover>

        <UInput
          v-if="editing === group.id"
          v-model="draftName"
          size="sm"
          class="flex-1"
          autofocus
          @blur="commitEdit(group.id)"
          @keydown.enter.prevent="commitEdit(group.id)"
          @keydown.esc="editing = null"
        />
        <button
          v-else
          type="button"
          class="flex-1 truncate rounded px-1 text-left text-sm"
          @click="startEdit(group.id, group.name)"
        >
          {{ group.name }}
        </button>

        <span class="shrink-0 text-xs text-dimmed tabular-nums">{{ group.count ?? 0 }}</span>

        <UTooltip :text="t('common.delete')">
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('common.delete')"
            @click="destroy(group.id, group.name)"
          />
        </UTooltip>
      </li>
    </ul>

    <p class="text-xs text-dimmed">
      {{ t('group.deleteHint') }}
    </p>
  </div>
</template>
