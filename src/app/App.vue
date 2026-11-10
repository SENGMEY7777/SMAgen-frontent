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
      return `${appTitle}: ${session.title}`
    }
    return `${appTitle}: Chat, Work, Create & Innovate`
  }

  if (route.name === 'run-detail') {
    return `${appTitle}: Workflow run`
  }

  if (route.name === 'home' || !route.name) {
    return `${appTitle}: Chat, Work, Create & Innovate`
  }

  if (route.meta?.title) {
    return `${appTitle}: ${route.meta.title}`
  }

  return `${appTitle}: Chat, Work, Create & Innovate`
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
