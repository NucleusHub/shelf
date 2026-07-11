<script setup>
import TemplateModal from '@core/TemplateModal.vue'
import { useI18n } from '@core/useI18n.js'

// Intentionally blank for now — the settings shell is wired up (header gear →
// this modal) but has no options yet. Add controls here later.
defineProps({ show: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const { t } = useI18n()
</script>

<template>
  <TemplateModal :show="show" header size="md" :title="t('shelf.settings.title')" @cancel="emit('close')">
    <div class="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
      {{ t('shelf.settings.comingSoon') }}
    </div>
  </TemplateModal>
</template>
