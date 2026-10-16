<script setup lang="ts">
import { GROUP_COLORS } from '~/composables/useGroups';

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
const color = ref(GROUP_COLORS[0] as string);
const busy = ref(false);

const editing = ref<number | null>(null);
const draftName = ref('');

async function create() {
  if (!name.value.trim() || busy.value) {
    return;
  }

  busy.value = true;
  try {
    await add({ name: name.value, color: color.value });
    name.value = '';
    // Step along the palette so two groups made in a row look different.
    const next = GROUP_COLORS.indexOf(color.value) + 1;
    color.value = GROUP_COLORS[next % GROUP_COLORS.length] as string;
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

async function recolor(id: number, value: string) {
  try {
    await update(id, { color: value });
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
    <form class="flex flex-wrap items-stretch gap-2" @submit.prevent="create">
      <UPopover>
        <UButton color="neutral" variant="outline" :aria-label="t('group.color')">
          <span class="size-4 rounded-full" :style="{ backgroundColor: color }" />
        </UButton>
        <template #content>
          <div class="grid grid-cols-6 gap-1 p-2">
            <button
              v-for="option in GROUP_COLORS"
              :key="option"
              type="button"
              class="size-7 rounded-full"
              :style="{ backgroundColor: option }"
              :aria-label="option"
              @click="color = option"
            />
          </div>
        </template>
      </UPopover>

      <UInput
        v-model="name"
        class="min-w-40 flex-1"
        :placeholder="t('group.namePlaceholder')"
        :aria-label="t('group.name')"
      />

      <UButton
        type="submit"
        color="neutral"
        variant="outline"
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
            class="grid size-8 shrink-0 place-items-center rounded-full"
            :aria-label="t('group.color')"
          >
            <span class="size-4 rounded-full" :style="{ backgroundColor: group.color }" />
          </button>
          <template #content>
            <div class="grid grid-cols-4 gap-1 p-2">
              <button
                v-for="option in GROUP_COLORS"
                :key="option"
                type="button"
                class="size-7 rounded-full"
                :style="{ backgroundColor: option }"
                :aria-label="option"
                @click="recolor(group.id, option)"
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

        <span v-if="group.count" class="shrink-0 text-xs text-muted tabular-nums">{{ group.count }}</span>

        <UTooltip :text="t('group.deleteHint')">
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.delete')"
            @click="destroy(group.id, group.name)"
          />
        </UTooltip>
      </li>
    </ul>
  </div>
</template>
