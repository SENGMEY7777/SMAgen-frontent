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
          <IconSearch :size="15" />
          <input placeholder="Search" aria-label="Search" />
          <span class="keyboard-key">⌘K</span>
        </label>
      </div>

      <!-- Flush Edge Scrollable Body -->
      <div class="sidebar-scrollable">
        <nav class="side-nav" aria-label="Main navigation">
          <RouterLink class="nav-item" to="/overview" active-class="router-link-exact-active" @click="closeMenu">
            <IconHome :size="16" />
            <span>Dashboard</span>
          </RouterLink>
          <RouterLink class="nav-item" :to="{ name: 'chat' }" exact-active-class="router-link-exact-active" @click="closeMenu">
            <IconMessageCircle2 :size="16" />
            <span>AI Chat & Agent</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/workflows" active-class="router-link-exact-active" @click="closeMenu">
            <IconGitFork :size="16" />
            <span>Workflows (DAG)</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/artifacts" active-class="router-link-exact-active" @click="closeMenu">
            <IconFolder :size="16" />
            <span>Artifacts</span>
          </RouterLink>
          <RouterLink
            v-if="auth.isPrivileged"
            class="nav-item"
            to="/approvals"
            active-class="router-link-exact-active"
            @click="closeMenu"
          >
            <IconShieldCheck :size="16" />
            <span>Security Approvals</span>
            <span v-if="pendingApprovalsCount > 0" class="nav-badge-pill">{{ pendingApprovalsCount }}</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/telemetry" active-class="router-link-exact-active" @click="closeMenu">
            <IconChartBar :size="16" />
            <span>Telemetry & Costs</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/tools" active-class="router-link-exact-active" @click="closeMenu">
            <IconTool :size="16" />
            <span>Tool Integrations</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/library" active-class="router-link-exact-active" @click="closeMenu">
            <IconBook :size="16" />
            <span>Template Library</span>
          </RouterLink>
        </nav>

        <div class="project-sidebar-section">
          <div class="project-sidebar-header">
            <RouterLink class="project-sidebar-title" to="/projects" @click="closeMenu">
              <span>Projects</span>
            </RouterLink>
            <button
              class="project-upload-btn"
              type="button"
              title="Upload local project"
              aria-label="Upload local project"
              @click="openProjectUpload"
            >
              <IconFolderPlus :size="17" />
            </button>
            <input
              ref="projectUploadInput"
              class="project-upload-input"
              type="file"
              webkitdirectory
              directory
              multiple
              aria-hidden="true"
              tabindex="-1"
              @change="handleProjectUpload"
            />
          </div>

          <div class="project-sidebar-list">
            <div v-for="project in projectsStore.projects" :key="project.id" class="project-sidebar-group">
              <div class="project-sidebar-project-row">
                <button
                  class="project-sidebar-project"
                  :class="{ active: isProjectActive(project.id) }"
                  type="button"
                  :title="project.workspacePath"
                  @click="toggleProject(project.id)"
                >
                  <IconFolderOpen v-if="isProjectExpanded(project.id)" :size="17" />
                  <IconFolder v-else :size="17" />
                  <span>{{ project.name }}</span>
                </button>
                <div class="project-sidebar-actions" :class="{ active: activeProjectMenuId === project.id }">
                  <button
                    class="project-action-btn"
                    :class="{ active: activeProjectMenuId === project.id }"
                    type="button"
                    aria-label="Project options"
                    title="Project options"
                    @click.stop="toggleProjectMenu(project.id, $event)"
                  >
                    <IconDotsVertical :size="15" />
                  </button>
                  <button
                    class="project-action-btn"
                    type="button"
                    aria-label="New chat in project"
                    title="New chat in project"
                    @click.stop="startProjectChat(project.id)"
                  >
                    <IconPlus :size="16" />
                  </button>
                </div>
              </div>

              <div v-if="activeProjectMenuId === project.id" class="project-dropdown-menu" @click.stop>
                <button class="project-dropdown-item" type="button" @click.stop="copyProjectName(project)">
                  <IconCopy :size="16" />
                  <span>Copy Project Name</span>
                </button>
                <button class="project-dropdown-item" type="button" @click.stop="openProjectSettings(project)">
                  <IconSettings :size="16" />
                  <span>Project Settings</span>
                </button>
                <button class="project-dropdown-item" type="button" @click.stop="copyProjectPath(project)">
                  <IconBrandFinder :size="16" />
                  <span>Copy Workspace Path</span>
                </button>
                <div class="project-dropdown-divider"></div>
                <button class="project-dropdown-item danger" type="button" @click.stop="deleteProject(project)">
                  <IconTrash :size="16" />
                  <span>Delete Project</span>
                </button>
              </div>

              <Transition name="project-history">
                <div v-if="isProjectExpanded(project.id) && projectItemsById[project.id]?.length" class="project-sidebar-items">
                  <div
                    v-for="item in projectItemsById[project.id]"
                    :key="`${project.id}-${item.type}-${item.id}`"
                    class="project-sidebar-item"
                    :class="{ active: isItemActive(item) }"
                  >
                    <button
                      v-if="item.type === 'chat'"
                      class="project-sidebar-item-link"
                      type="button"
                      :title="item.title"
                      @click="selectChat(item.id)"
                    >
                      <span class="project-sidebar-item-title">{{ item.title }}</span>
                      <span class="project-sidebar-item-time">{{ formatRecentTime(item.updatedAt) }}</span>
                    </button>
                    <RouterLink
                      v-else
                      class="project-sidebar-item-link"
                      :to="`/runs/${item.id}`"
                      :title="item.title"
                      @click="closeMenu"
                    >
                      <span class="project-sidebar-item-title">{{ item.title }}</span>
                      <span class="project-sidebar-item-time">{{ formatRecentTime(item.updatedAt) }}</span>
                    </RouterLink>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <div v-if="unassignedItems.length" class="side-section">
          <div class="side-label-row">
            <span class="side-label">Chats and tasks</span>
          </div>
          <div class="recent-list">
            <template v-for="item in unassignedItems" :key="item.id">
              <div
                class="recent-row"
                :class="{ 'active-chat': isItemActive(item), 'is-pinned': item.pinned }"
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
                  <IconDotsVertical :size="13" />
                </button>

                <!-- Floating Dropdown Menu Card -->
                <div v-if="activeMenuId === item.id" class="item-dropdown-menu" @click.stop>
                  <button class="dropdown-item" type="button" @click.stop="handlePin(item)">
                    <IconPin :size="15" />
                    <span class="dropdown-label">{{ item.pinned ? 'Unpin' : 'Pin' }}</span>
                    <span class="dropdown-shortcut">P</span>
                  </button>
                  <button class="dropdown-item" type="button" @click.stop="startRename(item)">
                    <IconPencil :size="15" />
                    <span class="dropdown-label">Rename</span>
                    <span class="dropdown-shortcut">R</span>
                  </button>
                  <button class="dropdown-item" type="button" @click.stop="handleAddToProject(item)">
                    <IconStack2 :size="15" />
                    <span class="dropdown-label">Add to project</span>
                    <IconChevronRight :size="13" class="dropdown-arrow" />
                  </button>
                  <button class="dropdown-item" type="button" @click.stop="handleMoveToGroup(item)">
                    <IconFolder :size="15" />
                    <span class="dropdown-label">Move to group</span>
                    <IconChevronRight :size="13" class="dropdown-arrow" />
                  </button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item danger" type="button" @click.stop="handleDelete(item)">
                    <IconTrash :size="15" />
                    <span class="dropdown-label">Delete</span>
                    <span class="dropdown-shortcut">D</span>
                  </button>
                </div>
              </div>
            </template>

            <span v-if="!unassignedItems.length" class="recent-empty">No unassigned activity</span>
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
          <IconSettings :size="15" class="account-settings-icon" />
        </button>
      </div>
    </aside>

    <div v-if="mobileOpen" class="sidebar-backdrop" @click="closeMenu"></div>

    <section class="content-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu" type="button" aria-label="Open menu" @click="mobileOpen = !mobileOpen">
            <IconMenu2 :size="18" />
          </button>
          <div class="model-picker">
            <span class="model-dot"><IconSparkles :size="12" /></span>
            <span>KAIRO 4o</span>
            <IconChevronDown :size="13" />
          </div>
        </div>
        <div class="top-actions">
          <button class="new-chat-btn" type="button" @click="newChat">
            <IconPlus :size="14" />
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
    <ConfirmDialog
      :open="Boolean(projectToDelete)"
      title="Delete project?"
      :message="deleteProjectMessage"
      @confirm="confirmDeleteProject"
      @cancel="cancelDeleteProject"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  IconSearch,
  IconHome,
  IconMessageCircle2,
  IconFolderPlus,
  IconGitFork,
  IconFolder,
  IconFolderOpen,
  IconBrandFinder,
  IconShieldCheck,
  IconChartBar,
  IconTool,
  IconBook,
  IconCopy,
  IconDotsVertical,
  IconPin,
  IconPencil,
  IconStack2,
  IconChevronRight,
  IconTrash,
  IconSettings,
  IconMenu2,
  IconSparkles,
  IconChevronDown,
  IconPlus,
} from '@tabler/icons-vue'
import BrandMark from '@/components/branding/BrandMark.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useProjectsStore } from '@/stores/projects'

import { api } from '@/services/api'

const props = defineProps({
  recentItems: { type: Array, default: () => [] },
})

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const chatStore = useChatStore()
const projectsStore = useProjectsStore()
const mobileOpen = ref(false)
const pendingApprovalsCount = ref(0)
const collapsedProjectIds = ref(new Set())

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

const isProjectActive = (projectId) => {
  return route.name === 'projects' && projectsStore.activeProjectId === projectId
}

const isItemActive = (item) => {
  if (item.type === 'chat') {
    return chatStore.activeSessionId === item.id && route.name === 'chat'
  }
  if (item.type === 'workflow') {
    return route.name === 'run-detail' && String(route.params.runId) === String(item.id)
  }
  return false
}

const isProjectExpanded = (projectId) => !collapsedProjectIds.value.has(projectId)

const toggleProjectHistory = (projectId) => {
  const next = new Set(collapsedProjectIds.value)
  if (next.has(projectId)) next.delete(projectId)
  else next.add(projectId)
  collapsedProjectIds.value = next
}

const toggleProject = (projectId) => {
  toggleProjectHistory(projectId)
}

const startProjectChat = (projectId) => {
  projectsStore.activeProjectId = projectId
  activeProjectMenuId.value = null
  chatStore.startNewChat()
  closeMenu()
  if (route.name !== 'chat') router.push({ name: 'chat' })
}

const projectUploadInput = ref(null)

const openProjectUpload = () => {
  closeMenu()
  projectUploadInput.value?.click()
}

const handleProjectUpload = (event) => {
  const files = Array.from(event.target.files || [])
  const firstRelativePath = files[0]?.webkitRelativePath || ''
  const projectName = firstRelativePath.split('/')[0] || files[0]?.name || ''

  if (!projectName) {
    event.target.value = ''
    return
  }

  const workspacePath = `local://${projectName}`
  const existingProject = projectsStore.projects.find(
    (project) => project.name === projectName && project.workspacePath === workspacePath,
  )

  if (existingProject) {
    projectsStore.activeProjectId = existingProject.id
  } else {
    projectsStore.createProject({
      name: projectName,
      description: `Imported from your local computer (${files.length} file${files.length === 1 ? '' : 's'}).`,
      workspacePath,
      tags: ['Local', 'Imported'],
    })
  }

  event.target.value = ''
  chatStore.startNewChat()
  router.push({ name: 'chat' })
}

const getProjectIdForItem = (item) => {
  const explicitlyLinkedProject = projectsStore.projects.find((project) =>
    project.linkedItems?.some((linkedItemId) => String(linkedItemId) === String(item.id)),
  )
  if (explicitlyLinkedProject) return explicitlyLinkedProject.id

  if (item.type === 'chat') {
    return chatStore.sessions.find((session) => String(session.id) === String(item.id))?.projectId || null
  }

  const linkedSession = chatStore.sessions.find((session) =>
    session.messages?.some((message) => String(message?.workflow?.runId) === String(item.id)),
  )
  return linkedSession?.projectId || null
}

const newChat = () => {
  projectsStore.activeProjectId = null
  chatStore.startNewChat()
  closeMenu()
  if (route.name !== 'chat') {
    router.push({ name: 'chat' })
  }
}

const selectChat = (sessionId) => {
  chatStore.selectSession(sessionId)
  const projId = getProjectIdForItem({ id: sessionId, type: 'chat' })
  projectsStore.activeProjectId = projId || null
  if (projId && collapsedProjectIds.value.has(projId)) {
    toggleProjectHistory(projId)
  }
  closeMenu()
  if (route.name !== 'chat') {
    router.push({ name: 'chat' })
  }
}

const formatRecentTime = (timestamp) => {
  if (!timestamp) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

const activeMenuId = ref(null)
const activeProjectMenuId = ref(null)
const projectToDelete = ref(null)
const renamingId = ref(null)
const renameDraft = ref('')

const deleteProjectMessage = computed(() => {
  return projectToDelete.value
    ? `Are you sure you want to delete "${projectToDelete.value.name}"? This action cannot be undone.`
    : ''
})

const toggleProjectMenu = (projectId, event) => {
  event?.stopPropagation()
  activeProjectMenuId.value = activeProjectMenuId.value === projectId ? null : projectId
}

const copyProjectName = async (project) => {
  try {
    await navigator.clipboard.writeText(project.name)
  } catch {}
  activeProjectMenuId.value = null
}

const copyProjectPath = async (project) => {
  try {
    await navigator.clipboard.writeText(project.workspacePath)
  } catch {}
  activeProjectMenuId.value = null
}

const openProjectSettings = (project) => {
  projectsStore.activeProjectId = project.id
  activeProjectMenuId.value = null
  router.push({ name: 'projects' })
}

const requestDeleteProject = (project) => {
  activeProjectMenuId.value = null
  projectToDelete.value = project
}

const cancelDeleteProject = () => {
  projectToDelete.value = null
}

const confirmDeleteProject = () => {
  if (!projectToDelete.value) return
  projectsStore.deleteProject(projectToDelete.value.id)
  projectToDelete.value = null
}

const deleteProject = (project) => {
  requestDeleteProject(project)
}

const toggleMenu = (id, event) => {
  event?.stopPropagation()
  activeMenuId.value = activeMenuId.value === id ? null : id
}

const closeAllMenus = () => {
  activeMenuId.value = null
  activeProjectMenuId.value = null
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
  if (projectsStore.activeProjectId) {
    projectsStore.assignItemToProject(item.id, projectsStore.activeProjectId)
  }
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
      if (route.name !== 'chat') router.push({ name: 'chat' })
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
  // A workflow prompt is also persisted as a chat session. Prefer the chat
  // entry in the sidebar so clicking the conversation opens Chat, not Canvas.
  const chatLinkedRunIds = new Set(
    chatStore.sessions
      .flatMap((session) => (session.messages || []).map((message) => message?.workflow?.runId).filter(Boolean))
      .map((runId) => String(runId)),
  )

  const workflowItems = props.recentItems
    .filter((r, index, recentItems) => {
      if (hiddenWorkflowIds.value.includes(r.id)) return false
      return recentItems.findIndex((item) => String(item.id) === String(r.id)) === index
    })
    .filter((r) => !chatLinkedRunIds.has(String(r.id)))
    .map((r) => ({
      id: r.id,
      title: r.goal_prompt || r.title || 'Workflow run',
      type: 'workflow',
      pinned: false,
      updatedAt: new Date(r.created_at || r.updatedAt || 0).getTime(),
    }))

  const chatItems = chatStore.sessions
    .map((s) => ({
      id: s.id,
      title: s.title,
      type: 'chat',
      pinned: Boolean(s.pinned),
      updatedAt: new Date(s.updatedAt || s.createdAt || 0).getTime(),
    }))

  const merged = [...chatItems, ...workflowItems]
  merged.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt - a.updatedAt
  })
  return merged
})

const projectItemsById = computed(() => {
  const groups = Object.fromEntries(projectsStore.projects.map((project) => [project.id, []]))
  combinedRecentItems.value.forEach((item) => {
    const projectId = getProjectIdForItem(item)
    if (projectId && groups[projectId]) groups[projectId].push(item)
  })
  return groups
})

const unassignedItems = computed(() => {
  return combinedRecentItems.value.filter((item) => !getProjectIdForItem(item))
})
</script>

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

.project-sidebar-section {
  margin-top: 16px;
  padding: 0 6px 8px 4px;
}

.project-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 8px 6px;
}

.project-sidebar-title {
  color: #6b7280;
  font-size: 15px;
  font-weight: 650;
  text-decoration: none;
}

.project-sidebar-title:hover {
  color: #111827;
}

.project-upload-btn {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.project-upload-btn:hover,
.project-upload-btn:focus-visible {
  background: #e5e7eb;
  color: #111827;
  outline: none;
}

.project-sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-sidebar-group {
  position: relative;
  min-width: 0;
}

.project-sidebar-project-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.project-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.project-sidebar-group:hover .project-sidebar-actions,
.project-sidebar-actions:focus-within,
.project-sidebar-actions.active {
  opacity: 1;
}

.project-action-btn {
  display: grid;
  place-items: center;
  width: 25px;
  height: 27px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.project-action-btn:hover,
.project-action-btn.active {
  background: #e4e4e7;
  color: #18181b;
}

.project-sidebar-project {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 7px 6px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #6b7280;
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.project-sidebar-project:hover,
.project-sidebar-project.active {
  background: #f3f4f6;
  color: #111827;
}

.project-sidebar-project svg {
  flex: 0 0 auto;
}

.project-sidebar-project span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-dropdown-menu {
  position: absolute;
  top: 34px;
  right: 0;
  z-index: 500;
  min-width: 214px;
  padding: 5px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
  animation: menuIn 0.12s ease-out;
}

.project-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #18181b;
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.project-dropdown-item:hover {
  background: #f4f4f5;
}

.project-dropdown-item.danger {
  color: #b91c1c;
}

.project-dropdown-item.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.project-dropdown-divider {
  height: 1px;
  margin: 4px 6px;
  background: #f3f4f6;
}

.project-sidebar-items {
  margin: 0 0 5px 14px;
  padding: 2px 0 2px 7px;
  border-left: 1px solid #e5e7eb;
}

.project-history-enter-active,
.project-history-leave-active {
  max-height: 600px;
  overflow: hidden;
  transition: max-height 0.2s ease, opacity 0.16s ease, transform 0.2s ease;
}

.project-history-enter-from,
.project-history-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.project-sidebar-item {
  min-width: 0;
  border-radius: 7px;
}

.project-sidebar-item:hover,
.project-sidebar-item.active {
  background: #ececee;
}

.project-sidebar-item-link {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 7px 6px 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #6b7280;
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.project-sidebar-item-link:hover,
.project-sidebar-item.active .project-sidebar-item-link {
  color: #111827;
}

.project-sidebar-item-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.project-sidebar-item-time {
  flex: 0 0 auto;
  color: #9ca3af;
  font-size: 12px;
}

.project-upload-input {
  display: none;
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
