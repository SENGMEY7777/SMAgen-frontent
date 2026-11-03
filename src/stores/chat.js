import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '@/config/constants'
import { useProjectsStore } from '@/stores/projects'

const CHATS_STORAGE_KEY = STORAGE_KEYS.CHATS || 'kairo_chats'
const ACTIVE_CHAT_STORAGE_KEY = `${CHATS_STORAGE_KEY}:active-session`
const LEGACY_PROJECT_MIGRATION_KEY = 'kairo_chat_project_migration_v1'
const PROJECT_LINKING_CLEANUP_KEY = 'kairo_chat_project_linking_cleanup_v2'

const createMessageId = () => `message_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const readStorage = () => {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []

    // Older builds could persist the same session more than once. Keep the
    // first copy so a refresh cannot render duplicate sidebar entries.
    const seenIds = new Set()
    return parsed.filter((session) => {
      if (!session?.id || seenIds.has(String(session.id))) return false
      seenIds.add(String(session.id))
      return true
    })
  } catch {
    return []
  }
}

const readActiveSessionId = (storedSessions) => {
  try {
    const activeId = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY)
    return activeId && storedSessions.some((session) => String(session.id) === activeId)
      ? activeId
      : null
  } catch {
    return null
  }
}

export const useChatStore = defineStore('chat', () => {
  const projectsStore = useProjectsStore()
  const storedSessions = readStorage()

  // An older build automatically attached every existing chat to the active
  // project. Remove only those stale UI associations once; chat messages stay.
  if (
    localStorage.getItem(LEGACY_PROJECT_MIGRATION_KEY) &&
    !localStorage.getItem(PROJECT_LINKING_CLEANUP_KEY)
  ) {
    storedSessions.forEach((session) => {
      delete session.projectId
    })

    projectsStore.projects.forEach((project) => {
      if (Array.isArray(project.linkedItems) && project.linkedItems.length) {
        project.linkedItems = []
        project.updatedAt = new Date().toISOString()
      }
    })

    try {
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(storedSessions))
    } catch {}
    localStorage.setItem(PROJECT_LINKING_CLEANUP_KEY, '1')
  }

  const sessions = ref(storedSessions)
  const activeSessionId = ref(readActiveSessionId(sessions.value))

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

  watch(activeSessionId, (value) => {
    try {
      if (value) {
        localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, String(value))
      } else {
        localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY)
      }
    } catch {}
  })

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

  const addMessage = ({ role, content, images = [], files = [], ...rest }) => {
    const timestamp = new Date().toISOString()
    const message = {
      id: rest.id || createMessageId(),
      role,
      content,
      images,
      files,
      ...rest,
      createdAt: rest.createdAt || timestamp,
    }

    if (!activeSessionId.value) {
      // Create new session from first prompt
      const title = content ? (content.length > 50 ? `${content.slice(0, 47)}...` : content) : (files.length ? `File: ${files[0].name}` : 'Attachment message')
      const newSession = {
        id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        type: 'chat',
        projectId: projectsStore.activeProjectId || null,
        messages: [message],
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      sessions.value.unshift(newSession)
      activeSessionId.value = newSession.id
      return newSession
    }

    const session = sessions.value.find((s) => s.id === activeSessionId.value)
    if (session) {
      session.messages.push(message)
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

  const updateMessage = (index, updates) => {
    const session = sessions.value.find((s) => s.id === activeSessionId.value)
    const message = session?.messages?.[index]
    if (!message || !updates || typeof updates !== 'object') return null

    Object.assign(message, updates)
    session.updatedAt = new Date().toISOString()
    return message
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
    updateMessage,
    renameSession,
    togglePinSession,
    deleteSession,
    clearAllChats,
  }
})
