<script setup>
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'

import { confirmDialogState, resolveConfirmDialog } from '../utils/confirmDialog'

const confirmBtnClass = computed(() => {
  return confirmDialogState.destructive
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-200'
    : 'bg-brand hover:bg-brand-dark focus:ring-brand/20'
})

function onCancel() {
  resolveConfirmDialog(false)
}

function onConfirm() {
  resolveConfirmDialog(true)
}
</script>

<template>
  <TransitionRoot as="template" :show="confirmDialogState.open">
    <Dialog as="div" class="relative z-50" @close="onCancel">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-1 scale-[0.98]"
            enter-to="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 scale-100"
            leave-to="opacity-0 translate-y-1 scale-[0.98]"
          >
            <DialogPanel class="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
              <DialogTitle class="text-base font-semibold text-gray-900">
                {{ confirmDialogState.title }}
              </DialogTitle>

              <div v-if="confirmDialogState.message" class="mt-2 text-sm text-gray-600 whitespace-pre-line">
                {{ confirmDialogState.message }}
              </div>

              <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" class="btn btn-outline btn-md" @click="onCancel">
                  {{ confirmDialogState.cancelText }}
                </button>
                <button
                  type="button"
                  class="btn btn-md text-white focus:outline-none focus:ring-4"
                  :class="confirmBtnClass"
                  @click="onConfirm"
                >
                  {{ confirmDialogState.confirmText }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
