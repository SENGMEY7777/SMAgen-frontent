<template>
  <RouterView />
</template>

<script setup>
import { watch, computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const route = useRoute()
const chatStore = useChatStore()
const appTitle = import.meta.env.VITE_APP_TITLE || 'KAIRO'

const dynamicTitle = computed(() => {
  if (route.name === 'chat') {
    const session = chatStore.activeSession
    if (session && session.title) {
      return `${session.title} - ${appTitle}`
    }
    return `New chat - ${appTitle}`
  }

  if (route.name === 'run-detail') {
    return `Workflow run - ${appTitle}`
  }

  if (route.meta?.title) {
    return `${route.meta.title} - ${appTitle}`
  }

  return appTitle
})

watch(
  dynamicTitle,
  (newTitle) => {
    if (typeof document !== 'undefined' && newTitle) {
      document.title = newTitle
    }
  },
  { immediate: true },
)
</script>
