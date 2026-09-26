<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'

import { api } from '../services/api'

const props = defineProps({
  recentItems: { type: Array, default: () => [] },
})

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const chatStore = useChatStore()
const mobileOpen = ref(false)
const pendingApprovalsCount = ref(0)

const fetchApprovalsCount = async () => {
  if (auth.isPrivileged) {
    try {
      const res = await api.listApprovals().catch(() => ({ data: [] }))
      pendingApprovalsCount.value = (res?.data || []).length
    } catch {
      pendingApprovalsCount.value = 0
    }
  }
}

fetchApprovalsCount()

const closeMenu = () => {
  mobileOpen.value = false
}

const newChat = () => {
  chatStore.startNewChat()
  closeMenu()
  if (route.path !== '/') {
    router.push('/')
  }
}

const selectChat = (sessionId) => {
  chatStore.selectSession(sessionId)
  closeMenu()
  if (route.path !== '/') {
    router.push('/')
  }
}

const activeMenuId = ref(null)
const renamingId = ref(null)
const renameDraft = ref('')

const toggleMenu = (id, event) => {
  event?.stopPropagation()
  activeMenuId.value = activeMenuId.value === id ? null : id
}

const closeAllMenus = () => {
  activeMenuId.value = null
}

const handlePin = (item) => {
  if (item.type === 'chat') {
    chatStore.togglePinSession(item.id)
  }
  closeAllMenus()
}

const startRename = (item) => {
  renamingId.value = item.id
  renameDraft.value = item.title
  closeAllMenus()
}

const saveRename = (item) => {
  if (renamingId.value === item.id && renameDraft.value.trim()) {
    if (item.type === 'chat') {
      chatStore.renameSession(item.id, renameDraft.value.trim())
    }
  }
  renamingId.value = null
  renameDraft.value = ''
}

const cancelRename = () => {
  renamingId.value = null
  renameDraft.value = ''
}

const handleAddToProject = (item) => {
  closeAllMenus()
}

const handleMoveToGroup = (item) => {
  closeAllMenus()
}

const hiddenWorkflowIds = ref(JSON.parse(localStorage.getItem('hidden_workflow_runs') || '[]'))

const handleDelete = (item) => {
  if (item.type === 'chat') {
    const isCurrentActive = chatStore.activeSessionId === item.id
    chatStore.deleteSession(item.id)
    if (isCurrentActive) {
      chatStore.startNewChat()
      if (route.path !== '/') router.push('/')
    }
  } else if (item.type === 'workflow') {
    hiddenWorkflowIds.value.push(item.id)
    try {
      localStorage.setItem('hidden_workflow_runs', JSON.stringify(hiddenWorkflowIds.value))
    } catch {}
  }
  closeAllMenus()
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', closeAllMenus)
}

const combinedRecentItems = computed(() => {
  const chatItems = chatStore.sessions.map((s) => ({
    id: s.id,
    title: s.title,
    type: 'chat',
    pinned: Boolean(s.pinned),
    updatedAt: new Date(s.updatedAt || s.createdAt || 0).getTime(),
  }))

  const workflowItems = props.recentItems
    .filter((r) => !hiddenWorkflowIds.value.includes(r.id))
    .map((r) => ({
      id: r.id,
      title: r.goal_prompt || r.title || 'Workflow run',
      type: 'workflow',
      pinned: false,
      updatedAt: new Date(r.created_at || r.updatedAt || 0).getTime(),
    }))

  const merged = [...chatItems, ...workflowItems]
  merged.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt - a.updatedAt
  })
  return merged
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ open: mobileOpen }">
      <!-- Fixed Sidebar Header -->
      <div class="sidebar-header">
        <div class="brand">
          <BrandMark />
          <span>KAIRO</span>
        </div>

        <label class="search-box">
          <AppIcon name="search" :size="15" />
          <input placeholder="Search" aria-label="Search" />
          <span class="keyboard-key">⌘K</span>
        </label>
      </div>

      <!-- Flush Edge Scrollable Body -->
      <div class="sidebar-scrollable">
        <nav class="side-nav" aria-label="Main navigation">
          <RouterLink class="nav-item" to="/overview" active-class="router-link-exact-active" @click="closeMenu">
            <AppIcon name="home" :size="16" />
            <span>Dashboard</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/" exact-active-class="router-link-exact-active" @click="closeMenu">
            <AppIcon name="chat" :size="16" />
            <span>AI Chat & Agent</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/workflows" active-class="router-link-exact-active" @click="closeMenu">
            <AppIcon name="diagram" :size="16" />
            <span>Workflows (DAG)</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/artifacts" active-class="router-link-exact-active" @click="closeMenu">
            <AppIcon name="folder" :size="16" />
            <span>Artifacts</span>
          </RouterLink>
          <RouterLink
            v-if="auth.isPrivileged"
            class="nav-item"
            to="/approvals"
            active-class="router-link-exact-active"
            @click="closeMenu"
          >
            <AppIcon name="shield" :size="16" />
            <span>Security Approvals</span>
            <span v-if="pendingApprovalsCount > 0" class="nav-badge-pill">{{ pendingApprovalsCount }}</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/telemetry" active-class="router-link-exact-active" @click="closeMenu">
            <AppIcon name="graph" :size="16" />
            <span>Telemetry & Costs</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/tools" active-class="router-link-exact-active" @click="closeMenu">
            <AppIcon name="tools" :size="16" />
            <span>Tool Integrations</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/library" active-class="router-link-exact-active" @click="closeMenu">
            <AppIcon name="library" :size="16" />
            <span>Template Library</span>
          </RouterLink>
        </nav>

        <div class="side-section">
          <div class="side-label-row">
            <span class="side-label">Chats and tasks</span>
          </div>
          <div class="recent-list">
            <template v-for="item in combinedRecentItems" :key="item.id">
              <div
                class="recent-row"
                :class="{ 'active-chat': chatStore.activeSessionId === item.id && route.path === '/', 'is-pinned': item.pinned }"
              >
                <!-- Bullet Circle -->
                <span class="item-circle" :class="{ pinned: item.pinned }"></span>

                <!-- Title or Inline Rename Input -->
                <div v-if="renamingId === item.id" class="inline-rename-box" @click.stop>
                  <input
                    v-model="renameDraft"
                    class="rename-input"
                    autofocus
                    @keydown.enter="saveRename(item)"
                    @keydown.esc="cancelRename"
                    @blur="saveRename(item)"
                  />
                </div>

                <!-- Chat Item Link -->
                <button
                  v-else-if="item.type === 'chat'"
                  class="recent-link"
                  type="button"
                  :title="item.title"
                  @click="selectChat(item.id)"
                >
                  <span class="recent-title">{{ item.title }}</span>
                </button>

                <!-- Workflow Item Link -->
                <RouterLink
                  v-else
                  class="recent-link"
                  :to="`/runs/${item.id}`"
                  :title="item.title"
                  @click="closeMenu"
                >
                  <span class="recent-title">{{ item.title }}</span>
                </RouterLink>

                <!-- 3-Dots Button -->
                <button
                  class="item-options-btn"
                  :class="{ active: activeMenuId === item.id }"
                  type="button"
                  aria-label="Options"
                  title="More options"
                  @click.stop="toggleMenu(item.id, $event)"
                >
                  <AppIcon name="dots-vertical" :size="13" />
                </button>

                <!-- Floating Dropdown Menu Card -->
                <div v-if="activeMenuId === item.id" class="item-dropdown-menu" @click.stop>
                  <button class="dropdown-item" type="button" @click.stop="handlePin(item)">
                    <AppIcon name="pin" :size="15" />
                    <span class="dropdown-label">{{ item.pinned ? 'Unpin' : 'Pin' }}</span>
                    <span class="dropdown-shortcut">P</span>
                  </button>
                  <button class="dropdown-item" type="button" @click.stop="startRename(item)">
                    <AppIcon name="pencil" :size="15" />
                    <span class="dropdown-label">Rename</span>
                    <span class="dropdown-shortcut">R</span>
                  </button>
                  <button class="dropdown-item" type="button" @click.stop="handleAddToProject(item)">
                    <AppIcon name="stack" :size="15" />
                    <span class="dropdown-label">Add to project</span>
                    <AppIcon name="chevron-right" :size="13" class="dropdown-arrow" />
                  </button>
                  <button class="dropdown-item" type="button" @click.stop="handleMoveToGroup(item)">
                    <AppIcon name="folder" :size="15" />
                    <span class="dropdown-label">Move to group</span>
                    <AppIcon name="chevron-right" :size="13" class="dropdown-arrow" />
                  </button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item danger" type="button" @click.stop="handleDelete(item)">
                    <AppIcon name="trash" :size="15" />
                    <span class="dropdown-label">Delete</span>
                    <span class="dropdown-shortcut">D</span>
                  </button>
                </div>
              </div>
            </template>

            <span v-if="!combinedRecentItems.length" class="recent-empty">No recent activity</span>
          </div>
        </div>
      </div>

      <!-- Fixed Sidebar Footer -->
      <div class="sidebar-footer">
        <button
          class="account-card"
          type="button"
          @click="router.push('/settings'); closeMenu()"
          title="Account Settings"
        >
          <span class="avatar">{{ auth.initials }}</span>
          <span class="account-copy">
            <span class="account-name">{{ auth.displayName }}</span>
            <span class="account-email">{{ auth.user?.email }}</span>
          </span>
          <AppIcon name="settings" :size="15" class="account-settings-icon" />
        </button>
      </div>
    </aside>

    <div v-if="mobileOpen" class="sidebar-backdrop" @click="closeMenu"></div>

    <section class="content-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu" type="button" aria-label="Open menu" @click="mobileOpen = !mobileOpen">
            <AppIcon name="menu" :size="18" />
          </button>
          <div class="model-picker">
            <span class="model-dot"><AppIcon name="spark" :size="12" /></span>
            <span>KAIRO 4o</span>
            <AppIcon name="chevron-down" :size="13" />
          </div>
        </div>
        <div class="top-actions">
          <button class="new-chat-btn" type="button" @click="newChat">
            <AppIcon name="plus" :size="14" />
            <span>New Chat</span>
          </button>
          <button
            class="avatar header-avatar"
            type="button"
            aria-label="Open settings"
            title="Settings"
            @click="router.push('/settings')"
          >
            {{ auth.initials }}
          </button>
        </div>
      </header>
      <main class="page-content">
        <slot />
      </main>
    </section>
  </div>
</template>

<style scoped>
.sidebar-header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 0 12px 6px 12px;
}

.sidebar-scrollable {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 3px 14px 12px;
  display: flex;
  flex-direction: column;
}

/* Claude AI Style Sidebar Scrollbar */
.sidebar-scrollable::-webkit-scrollbar {
  width: 5px;
}

.sidebar-scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scrollable::-webkit-scrollbar-thumb {
  background: #a1a1aa;
  border-radius: 999px;
}

.sidebar-scrollable::-webkit-scrollbar-thumb:hover {
  background: #71717a;
}

.side-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 8px;
}

.side-label {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: none;
}

.recent-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 2px 4px 2px 8px;
  transition: background 0.12s ease;
}

.recent-row:hover {
  background: #f3f4f6;
}

.recent-row.active-chat {
  background: #ececee;
}

.item-circle {
  width: 6px;
  height: 6px;
  border: 1px solid #d4d4d8;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-circle.pinned {
  background: #3b82f6;
  border-color: #3b82f6;
}

.inline-rename-box {
  flex: 1;
  min-width: 0;
}

.rename-input {
  width: 100%;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  background: #ffffff;
}

.recent-link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 0;
  font-size: 13.5px;
  line-height: 1.35;
  color: #374151;
  text-decoration: none;
}

.recent-row:hover .recent-link {
  color: #111827;
}

.recent-row.active-chat .recent-link {
  color: #111827;
  font-weight: 450;
}

.recent-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.item-options-btn {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.12s ease, background 0.12s ease;
}

.recent-row:hover .item-options-btn,
.item-options-btn.active {
  opacity: 1;
}

.item-options-btn:hover,
.item-options-btn.active {
  background: #e4e4e7;
  color: #18181b;
}

/* Floating Dropdown Menu Card */
.item-dropdown-menu {
  position: absolute;
  top: calc(100% + 2px);
  right: 6px;
  z-index: 500;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 5px;
  min-width: 180px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
  animation: menuIn 0.12s ease-out;
}

@keyframes menuIn {
  from { opacity: 0; transform: scale(0.96) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13.5px;
  color: #18181b;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.dropdown-item:hover {
  background: #f4f4f5;
}

.dropdown-item.danger {
  color: #b91c1c;
}

.dropdown-item.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.dropdown-label {
  flex: 1;
  font-weight: 450;
}

.dropdown-shortcut {
  font-size: 12px;
  color: #a1a1aa;
  font-weight: 500;
}

.dropdown-arrow {
  color: #a1a1aa;
}

.dropdown-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 4px 6px;
}

.nav-badge-pill {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  background: #ffedd5;
  color: #c2410c;
  line-height: 1.4;
}

.sidebar-footer {
  flex-shrink: 0;
  margin-top: auto;
  padding: 10px 12px 0 12px;
  border-top: 1px solid #e5e7eb;
  background: #fbfcfd;
}
</style>
