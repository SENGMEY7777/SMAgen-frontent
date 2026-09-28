import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '@/config/constants'

const CHATS_STORAGE_KEY = STORAGE_KEYS.CHATS || 'kairo_chats'

const readStorage = () => {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref(readStorage())
  const activeSessionId = ref(null)

  // Save changes to localStorage
  watch(
    sessions,
    (val) => {
      try {
        localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(val))
      } catch {}
    },
    { deep: true }
  )

  const activeSession = computed(() => {
    return sessions.value.find((s) => s.id === activeSessionId.value) || null
  })

  const messages = computed(() => {
    return activeSession.value ? activeSession.value.messages : []
  })

  const startNewChat = () => {
    activeSessionId.value = null
  }

  const selectSession = (sessionId) => {
    const exists = sessions.value.some((s) => s.id === sessionId)
    if (exists) {
      activeSessionId.value = sessionId
    }
  }

  const addMessage = ({ role, content, images = [], files = [] }) => {
    const timestamp = new Date().toISOString()

    if (!activeSessionId.value) {
      // Create new session from first prompt
      const title = content ? (content.length > 50 ? `${content.slice(0, 47)}...` : content) : (files.length ? `File: ${files[0].name}` : 'Attachment message')
      const newSession = {
        id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        type: 'chat',
        messages: [{ role, content, images, files, createdAt: timestamp }],
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      sessions.value.unshift(newSession)
      activeSessionId.value = newSession.id
      return newSession
    }

    const session = sessions.value.find((s) => s.id === activeSessionId.value)
    if (session) {
      session.messages.push({ role, content, images, files, createdAt: timestamp })
      session.updatedAt = timestamp
      // Reorder to top
      const idx = sessions.value.indexOf(session)
      if (idx > 0) {
        sessions.value.splice(idx, 1)
        sessions.value.unshift(session)
      }
    }
    return session
  }

  const deleteSession = (sessionId) => {
    const idx = sessions.value.findIndex((s) => s.id === sessionId)
    if (idx !== -1) {
      sessions.value.splice(idx, 1)
      if (activeSessionId.value === sessionId) {
        activeSessionId.value = null
      }
    }
  }

  const clearAllChats = () => {
    sessions.value = []
    activeSessionId.value = null
  }

  const editMessage = (index, newContent) => {
    const session = sessions.value.find((s) => s.id === activeSessionId.value)
    if (session && session.messages && session.messages[index]) {
      session.messages[index].content = newContent
      session.messages[index].updatedAt = new Date().toISOString()
      // Truncate messages after this index so AI generates new branch response
      session.messages = session.messages.slice(0, index + 1)
      session.updatedAt = new Date().toISOString()
    }
  }

  const renameSession = (sessionId, newTitle) => {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session && newTitle && newTitle.trim()) {
      session.title = newTitle.trim()
      session.updatedAt = new Date().toISOString()
    }
  }

  const togglePinSession = (sessionId) => {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.pinned = !session.pinned
      session.updatedAt = new Date().toISOString()
    }
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    startNewChat,
    selectSession,
    addMessage,
    editMessage,
    renameSession,
    togglePinSession,
    deleteSession,
    clearAllChats,
  }
})
