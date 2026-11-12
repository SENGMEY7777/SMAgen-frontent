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
      <div class="sidebar-scrollable" @scroll.passive="closeAllMenus">
        <nav class="side-nav" aria-label="Main navigation">
          <RouterLink class="nav-item" to="/overview" active-class="router-link-exact-active" @click="closeMenu">
            <IconHome :size="16" />
            <span>Dashboard</span>
          </RouterLink>
          <RouterLink
            class="nav-item"
            :class="{ 'router-link-exact-active': isAiChatNavActive }"
            :to="{ name: 'chat' }"
            exact-active-class="_"
            active-class="_"
            @click="newChat"
          >
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
              <div class="project-sidebar-project-row" :class="{ active: isProjectActive(project.id) }">
                <button
                  class="project-sidebar-project"
                  :class="{ active: isProjectActive(project.id) }"
                  type="button"
                  :title="project.workspacePath"
                  @click="toggleProject(project.id)"
                >
                  <IconFolderOpen v-if="isProjectExpanded(project.id)" :size="17" :style="{ color: project.color }" />
                  <IconFolder v-else :size="17" :style="{ color: project.color }" />
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

              <div v-if="activeProjectMenuId === project.id" class="project-dropdown-menu" :class="{ 'open-upward': projectMenuOpenUpward }" @click.stop>
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
                      class="project-sidebar-item-link"
                      type="button"
                      :title="item.title"
                      @click="selectChat(item.id, project.id)"
                    >
                      <span class="project-sidebar-item-title">{{ item.title }}</span>
                      <span class="project-sidebar-item-time">{{ formatRecentTime(item.updatedAt) }}</span>
                    </button>

                    <!-- Workflow Item Link -->
                    <button
                      v-else
                      class="project-sidebar-item-link"
                      type="button"
                      :title="item.title"
                      @click="selectWorkflowHistory(item)"
                    >
                      <span class="project-sidebar-item-title">{{ item.title }}</span>
                      <span class="project-sidebar-item-time">{{ formatRecentTime(item.updatedAt) }}</span>
                    </button>

                    <!-- 3-Dots Button -->
                    <button
                      class="item-options-btn"
                      :class="{ active: activeMenuId === `${project.id}-${item.id}` }"
                      type="button"
                      aria-label="Options"
                      title="More options"
                      @click.stop="toggleMenu(`${project.id}-${item.id}`, $event)"
                    >
                      <IconDotsVertical :size="13" />
                    </button>

                    <!-- Floating Dropdown Menu Card -->
                    <div
                      v-if="activeMenuId === `${project.id}-${item.id}`"
                      class="item-dropdown-menu"
                      :class="{ 'open-upward': menuOpenUpward }"
                      @click.stop
                    >
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
                      <button class="dropdown-item" type="button" @click.stop="handleRemoveFromProject(item, project.id)">
                        <IconFolderMinus :size="15" />
                        <span class="dropdown-label">Remove from project</span>
                      </button>
                      <div class="dropdown-divider"></div>
                      <button class="dropdown-item danger" type="button" @click.stop="handleDelete(item)">
                        <IconTrash :size="15" />
                        <span class="dropdown-label">Delete</span>
                        <span class="dropdown-shortcut">D</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <div v-if="unassignedItems.length || !projectsStore.projects.length" class="side-section">
          <div class="side-label-row">
            <span class="side-label">Chats and tasks</span>
          </div>
          <div class="recent-list">
            <template v-for="item in unassignedItems" :key="`${item.type}-${item.id}`">
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
                <button
                  v-else
                  class="recent-link"
                  type="button"
                  :title="item.title"
                  @click="selectWorkflowHistory(item)"
                >
                  <span class="recent-title">{{ item.title }}</span>
                </button>

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
                <div v-if="activeMenuId === item.id" class="item-dropdown-menu" :class="{ 'open-upward': menuOpenUpward }" @click.stop>
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

            <span v-if="!unassignedItems.length" class="recent-empty">No activity yet</span>
          </div>
        </div>
      </div>

      <!-- Fixed Sidebar Footer -->
      <div class="sidebar-footer">
        <div class="sidebar-footer-inner">
          <button
            class="account-card"
            type="button"
            @click="toggleAccountMenu"
            :title="`${auth.displayName} (${auth.user?.email || 'Account'})`"
            aria-label="Account menu"
          >
            <span class="avatar" :class="{ 'has-img': avatarSrc && !avatarError }">
              <img
                v-if="avatarSrc && !avatarError"
                :src="avatarSrc"
                :alt="auth.displayName"
                class="avatar-img"
                @error="handleAvatarError"
              />
              <span v-else>{{ auth.initials }}</span>
            </span>
            <span class="account-row-content">
              <span class="account-name">{{ auth.displayName }}</span>
              <span class="account-plan-sep">&middot;</span>
              <span class="account-plan-badge">Free</span>
              <IconChevronDown :size="13" class="account-chevron" :class="{ 'rotate-180': accountMenuOpen }" />
            </span>
          </button>

          <button
            class="sidebar-devices-btn"
            type="button"
            title="Desktop App"
            aria-label="Desktop App"
            @click.stop="openAccountSettings"
          >
            <IconDevices :size="18" />
          </button>
        </div>

        <!-- Account Dropdown Menu (Opens Upward) -->
        <div v-if="accountMenuOpen" class="account-dropdown-menu" @click.stop>
          <div class="account-dropdown-header">
            <span class="account-dropdown-name">{{ auth.displayName }}</span>
            <span class="account-dropdown-email">{{ auth.user?.email }}</span>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" type="button" @click.stop="openAccountSettings">
            <IconSettings :size="15" />
            <span class="dropdown-label">Settings</span>
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" type="button" @click.stop="handleAccountLogout">
            <IconLogout :size="15" />
            <span class="dropdown-label">Log out</span>
          </button>
        </div>
      </div>
    </aside>

    <div v-if="mobileOpen" class="sidebar-backdrop" @click="closeMenu"></div>

    <section class="content-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu" type="button" aria-label="Open menu" @click="mobileOpen = !mobileOpen">
            <IconMenu2 :size="18" />
          </button>
          <!-- <span
            v-if="route.name === 'chat' && chatStore.activeSession?.title"
            class="topbar-chat-title"
            :title="chatStore.activeSession.title"
          >
            {{ chatStore.activeSession.title }}
          </span> -->
        </div>
        <div class="top-actions">
          <button class="new-chat-btn" type="button" @click="newChat">
            <IconPlus :size="14" />
            <span>New Chat</span>
          </button>
          <button
            class="avatar header-avatar"
            :class="{ 'has-img': avatarSrc && !avatarError }"
            type="button"
            aria-label="Open settings"
            title="Settings"
            @click="router.push('/settings')"
          >
            <img
              v-if="avatarSrc && !avatarError"
              :src="avatarSrc"
              :alt="auth.displayName"
              class="avatar-img"
              @error="handleAvatarError"
            />
            <span v-else>{{ auth.initials }}</span>
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
import { computed, onMounted, ref, watch } from 'vue'
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
  IconPlus,
  IconChevronDown,
  IconDevices,
  IconLogout,
  IconFolderMinus,
} from '@tabler/icons-vue'
import BrandMark from '@/components/branding/BrandMark.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useProjectsStore } from '@/stores/projects'
import { getWorkflowRunId } from '@/utils/workflow'

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
const avatarError = ref(false)
const avatarSrc = ref(auth.avatar || auth.defaultAvatar)

watch(
  () => auth.avatar,
  (val) => {
    avatarSrc.value = val || auth.defaultAvatar
    avatarError.value = false
  },
  { immediate: true },
)

const handleAvatarError = () => {
  if (avatarSrc.value !== auth.defaultAvatar) {
    avatarSrc.value = auth.defaultAvatar
    avatarError.value = false
  } else {
    avatarError.value = true
  }
}

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

const getChatSessionForWorkflow = (runId) => {
  if (!runId) return null
  return (
    chatStore.sessions.find((session) =>
      session.messages?.some(
        (message) => message?.workflow?.runId && String(message.workflow.runId) === String(runId),
      ),
    ) || null
  )
}

const isAiChatNavActive = computed(() => {
  return route.name === 'chat' && !chatStore.activeSessionId
})

const isItemActive = (item) => {
  if (!item || !item.id) return false
  if (route.name === 'chat') {
    if (!chatStore.activeSessionId) return false
    if (item.type === 'chat') {
      return String(chatStore.activeSessionId) === String(item.id)
    }
    if (item.type === 'workflow') {
      return (
        String(chatStore.activeSessionId) === `chat_wf_${item.id}` ||
        String(item.chatSessionId) === String(chatStore.activeSessionId)
      )
    }
  }
  if (route.name === 'run-detail') {
    return (
      item.type === 'workflow' &&
      Boolean(route.params.runId) &&
      String(route.params.runId) === String(item.id)
    )
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

  const linkedSession = getChatSessionForWorkflow(item.id)
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

const selectChat = (sessionId, fallbackProjectId = null) => {
  chatStore.selectSession(sessionId)
  const projId = getProjectIdForItem({ id: sessionId, type: 'chat' }) || fallbackProjectId
  projectsStore.activeProjectId = projId || null
  if (projId && collapsedProjectIds.value.has(projId)) {
    toggleProjectHistory(projId)
  }
  closeMenu()
  if (route.name !== 'chat') {
    router.push({ name: 'chat' })
  }
}

const selectWorkflowHistory = (item) => {
  let linkedSession = item.chatSessionId
    ? chatStore.sessions.find((session) => String(session.id) === String(item.chatSessionId))
    : getChatSessionForWorkflow(item.id)

  if (!linkedSession) {
    const existing = chatStore.sessions.find(
      (s) => s.id === `chat_wf_${item.id}` || s.messages?.some((m) => String(m?.workflow?.runId) === String(item.id))
    )
    if (existing) {
      linkedSession = existing
    } else {
      // Automatically create a chat session for this workflow run so it displays in the chatbot first!
      const title = item.title || item.goal_prompt || 'Workflow run'
      const newSession = {
        id: `chat_wf_${item.id}`,
        title,
        type: 'chat',
        projectId: getProjectIdForItem(item) || null,
        messages: [
          {
            id: `msg_user_${item.id}`,
            role: 'user',
            content: title,
            createdAt: new Date(item.updatedAt || Date.now()).toISOString(),
            requestMode: 'workflow',
          },
          {
            id: `msg_wf_${item.id}`,
            role: 'assistant',
            content: '',
            createdAt: new Date(item.updatedAt || Date.now()).toISOString(),
            workflow: {
              runId: item.id,
              goalPrompt: title,
              status: item.status || 'COMPLETED',
              isStreamOpen: true,
            },
          },
        ],
        createdAt: new Date(item.updatedAt || Date.now()).toISOString(),
        updatedAt: new Date(item.updatedAt || Date.now()).toISOString(),
      }
      chatStore.sessions.unshift(newSession)
      linkedSession = newSession
    }
  }

  selectChat(linkedSession.id, getProjectIdForItem(item))
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
const menuOpenUpward = ref(false)
const projectMenuOpenUpward = ref(false)
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
  if (activeProjectMenuId.value === projectId) {
    activeProjectMenuId.value = null
    projectMenuOpenUpward.value = false
    return
  }

  if (event?.currentTarget) {
    const rect = event.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    projectMenuOpenUpward.value = spaceBelow < 260
  } else {
    projectMenuOpenUpward.value = false
  }

  activeProjectMenuId.value = projectId
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
  if (activeMenuId.value === id) {
    activeMenuId.value = null
    menuOpenUpward.value = false
    return
  }

  if (event?.currentTarget) {
    const rect = event.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    menuOpenUpward.value = spaceBelow < 260
  } else {
    menuOpenUpward.value = false
  }

  activeMenuId.value = id
}

const accountMenuOpen = ref(false)

const closeAllMenus = () => {
  activeMenuId.value = null
  activeProjectMenuId.value = null
  accountMenuOpen.value = false
  menuOpenUpward.value = false
  projectMenuOpenUpward.value = false
}

const toggleAccountMenu = (event) => {
  if (event) event.stopPropagation()
  const next = !accountMenuOpen.value
  closeAllMenus()
  accountMenuOpen.value = next
}

const openAccountSettings = () => {
  closeAllMenus()
  closeMenu()
  router.push('/settings')
}

const handleAccountLogout = async () => {
  closeAllMenus()
  closeMenu()
  await auth.logout()
  router.push('/auth')
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

const readHiddenWorkflowIds = () => {
  try {
    const raw = localStorage.getItem('hidden_workflow_runs')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

const hiddenWorkflowIds = ref(readHiddenWorkflowIds())

const isWorkflowHidden = (id) => {
  if (id === undefined || id === null || id === '') return false
  const strId = String(id)
  return hiddenWorkflowIds.value.some((h) => String(h) === strId)
}

const hideAndRemoveWorkflowRun = async (rawRunId) => {
  const runId = String(rawRunId || '').trim()
  if (!runId) return

  const currentSet = new Set(hiddenWorkflowIds.value.map(String))
  if (!currentSet.has(runId)) {
    hiddenWorkflowIds.value = [...hiddenWorkflowIds.value, runId]
    try {
      localStorage.setItem('hidden_workflow_runs', JSON.stringify(hiddenWorkflowIds.value))
    } catch {}
  }

  // Remove from loadedRuns immediately so UI reacts instantly
  loadedRuns.value = loadedRuns.value.filter((r) => {
    const id = getWorkflowRunId(r) || r?.id
    return String(id) !== runId
  })

  // Broadcast event so DashboardView, HistoryView, and other components update immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workflow-runs-updated', { detail: { deletedRunId: runId } }))
  }

  try {
    await api.deleteRun(runId)
  } catch (err) {
    console.warn('Backend deleteRun error (locally hidden):', err)
  }
}

const handleRemoveFromProject = (item, projectId) => {
  projectsStore.unassignItemFromProject?.(item.id, projectId)
  if (item.type === 'chat') {
    const session = chatStore.sessions.find((s) => String(s.id) === String(item.id))
    if (session && String(session.projectId) === String(projectId)) {
      delete session.projectId
    }
  }
  closeAllMenus()
}

const handleDelete = async (item) => {
  const itemId = String(item.id)
  const itemTitleNorm = normalizeTitle(item.title)

  // 1. Remove from all projects
  projectsStore.unassignItemFromAllProjects?.(item.id)
  projectsStore.unassignItemFromAllProjects?.(itemId)

  if (item.type === 'chat') {
    const session = chatStore.sessions.find((s) => String(s.id) === itemId)

    // Collect all linked workflow run IDs so deleting a chat won't leave orphaned workflow runs
    const linkedRunIds = new Set()
    if (itemId.startsWith('chat_wf_')) {
      linkedRunIds.add(itemId.replace('chat_wf_', ''))
    }
    if (session?.messages) {
      session.messages.forEach((m) => {
        const wfRunId = m.workflow?.runId || m.workflow?.run_id || m.workflowRunId || m.runId
        if (wfRunId) {
          linkedRunIds.add(String(wfRunId))
        }
      })
    }

    // Also match any workflow run with identical title or pointing to this session
    const allRuns = [...(props.recentItems || []), ...(loadedRuns.value || [])]
    allRuns.forEach((r) => {
      const rId = String(getWorkflowRunId(r) || r?.id || '')
      if (!rId) return
      const rTitleNorm = normalizeTitle(r.goal_prompt || r.title || r.name)
      if (rTitleNorm && itemTitleNorm && rTitleNorm === itemTitleNorm) {
        linkedRunIds.add(rId)
      }
      if (r.chatSessionId && String(r.chatSessionId) === itemId) {
        linkedRunIds.add(rId)
      }
    })

    const isCurrentActive = String(chatStore.activeSessionId) === itemId
    chatStore.deleteSession(item.id)
    chatStore.deleteSession(itemId)

    // Hide/delete linked workflow runs
    for (const runId of linkedRunIds) {
      await hideAndRemoveWorkflowRun(runId)
    }

    if (isCurrentActive) {
      chatStore.startNewChat()
      if (route.name !== 'chat') router.push({ name: 'chat' })
    }
  } else if (item.type === 'workflow') {
    await hideAndRemoveWorkflowRun(itemId)

    // Also remove any linked chat session
    const linkedSessions = chatStore.sessions.filter((s) => {
      if (String(s.id) === `chat_wf_${itemId}`) return true
      if (s.messages?.some((m) => {
        const wfRunId = m.workflow?.runId || m.workflow?.run_id || m.workflowRunId || m.runId
        return String(wfRunId) === itemId
      })) return true
      const sTitleNorm = normalizeTitle(s.title)
      if (sTitleNorm && itemTitleNorm && sTitleNorm === itemTitleNorm) return true
      return false
    })

    linkedSessions.forEach((s) => {
      const isCurrentActive = String(chatStore.activeSessionId) === String(s.id)
      chatStore.deleteSession(s.id)
      if (isCurrentActive) {
        chatStore.startNewChat()
        if (route.name !== 'chat') router.push({ name: 'chat' })
      }
    })
  }

  closeAllMenus()
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', closeAllMenus)
}

const loadedRuns = ref([])

const loadAllRuns = async () => {
  try {
    const res = await api.listRuns()
    if (res?.data && Array.isArray(res.data)) {
      loadedRuns.value = res.data.filter((r) => {
        const id = getWorkflowRunId(r) || r?.id
        return !isWorkflowHidden(id)
      })
    }
  } catch (err) {
    console.warn('Failed to load runs in DashboardLayout:', err)
  }
}

onMounted(() => {
  loadAllRuns()
})

// Refresh runs when route changes to make sure newly launched workflows appear in sidebar immediately
watch(
  () => route.fullPath,
  () => {
    loadAllRuns()
  },
)

const combinedRecentItems = computed(() => {
  // Combine runs from props and backend API so sidebar ALWAYS shows all history on every page!
  const allRuns = [...(props.recentItems || []), ...(loadedRuns.value || [])]
  const seenRunIds = new Set()
  const uniqueRuns = allRuns.filter((r) => {
    if (!r) return false
    const id = getWorkflowRunId(r) || r?.id
    if (!id) return false
    const idStr = String(id)
    if (seenRunIds.has(idStr) || isWorkflowHidden(idStr)) return false
    seenRunIds.add(idStr)
    return true
  })

  const workflowItems = uniqueRuns.map((r) => {
    const runId = getWorkflowRunId(r) || r.id
    return {
      id: runId,
      title: r.goal_prompt || r.title || r.name || 'Workflow run',
      type: 'workflow',
      status: r.status,
      chatSessionId: getChatSessionForWorkflow(runId)?.id || null,
      pinned: false,
      updatedAt: new Date(r.created_at || r.updatedAt || 0).getTime(),
    }
  })

  const chatItems = chatStore.sessions.map((s) => ({
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

const normalizeTitle = (title) => String(title || '').trim().toLowerCase().replace(/\s+/g, ' ')

const deduplicateSidebarItems = (items) => {
  if (!Array.isArray(items)) return []

  // 1. Identify all chat sessions present in this list
  const chatItems = items.filter((item) => item.type === 'chat')
  const existingChatIds = new Set(chatItems.map((c) => String(c.id)))
  const existingChatTitles = new Set(chatItems.map((c) => normalizeTitle(c.title)).filter(Boolean))

  // 2. Omit any workflow run that is already represented by a chat session (by linked chatSessionId or identical title)
  const nonRedundant = items.filter((item) => {
    if (item.type === 'workflow') {
      if (item.chatSessionId && existingChatIds.has(String(item.chatSessionId))) {
        return false
      }
      const norm = normalizeTitle(item.title)
      if (norm && existingChatTitles.has(norm)) {
        return false
      }
    }
    return true
  })

  // 3. Deduplicate multiple identical entries (keep the most recent one by ID and by normalized title)
  const seenIds = new Set()
  const seenTitles = new Set()

  return nonRedundant.filter((item) => {
    const idKey = `${item.type}:${item.id}`
    if (seenIds.has(idKey)) return false
    seenIds.add(idKey)

    const normTitle = normalizeTitle(item.title)
    if (normTitle) {
      if (seenTitles.has(normTitle)) return false
      seenTitles.add(normTitle)
    }

    return true
  })
}

const allHistoryItems = computed(() => {
  return deduplicateSidebarItems(combinedRecentItems.value)
})

const projectItemsById = computed(() => {
  const groups = Object.fromEntries(projectsStore.projects.map((project) => [project.id, []]))
  combinedRecentItems.value.forEach((item) => {
    const projectId = getProjectIdForItem(item)
    if (!projectId || !groups[projectId]) return
    groups[projectId].push(item)
  })

  // Apply deduplication per project
  for (const projectId of Object.keys(groups)) {
    groups[projectId] = deduplicateSidebarItems(groups[projectId])
  }
  return groups
})

const unassignedItems = computed(() => {
  const items = combinedRecentItems.value.filter((item) => !getProjectIdForItem(item))
  return deduplicateSidebarItems(items)
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
  padding: 0 4px 8px 6px;
}

.side-section .side-label {
  padding: 0;
  color: #6b7280;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  text-transform: none;
}

.side-label {
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
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
  border-radius: 7px;
  transition: background 0.12s ease;
}

.project-sidebar-project-row:hover,
.project-sidebar-project-row:focus-within,
.project-sidebar-project-row.active {
  background: #f3f4f6;
}

.project-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.project-sidebar-project-row:hover .project-sidebar-actions,
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

.project-sidebar-project-row:hover .project-sidebar-project,
.project-sidebar-project-row:focus-within .project-sidebar-project,
.project-sidebar-project.active {
  background: transparent;
  color: #111827;
}

.project-sidebar-project svg {
  flex: 0 0 auto;
}

.project-sidebar-project span {
  min-width: 0;
  font-weight: 600;
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

.project-dropdown-menu.open-upward {
  top: auto;
  bottom: calc(100% + 4px);
  transform-origin: bottom right;
  animation: menuInUp 0.12s ease-out;
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
  transition: max-height 0.1s ease, opacity 0.08s ease, transform 0.1s ease;
}

.project-history-enter-from,
.project-history-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.project-sidebar-item {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  border-radius: 7px;
  padding-right: 4px;
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
  min-height: 41px;
  border-radius: 7px;
  padding: 0 4px 0 6px;
  transition: background 0.12s ease;
}

.recent-row:hover {
  background: #f4f4f5;
}

.recent-row.active-chat {
  background: #ececee;
  font-weight: 500;
}

.item-circle {
  width: 6px;
  height: 6px;
  margin-left: 5px;
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
  padding: 7px 0;
  font-size: 14px;
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
  width: 25px;
  height: 27px;
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
.project-sidebar-item:hover .item-options-btn,
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
  transform-origin: top right;
}

.item-dropdown-menu.open-upward {
  top: auto;
  bottom: calc(100% + 4px);
  transform-origin: bottom right;
  animation: menuInUp 0.12s ease-out;
  box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.12), 0 -8px 10px -6px rgba(0, 0, 0, 0.08);
}

@keyframes menuIn {
  from { opacity: 0; transform: scale(0.96) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes menuInUp {
  from { opacity: 0; transform: scale(0.96) translateY(4px); }
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
  position: relative;
  flex-shrink: 0;
  margin-top: auto;
  padding: 8px 10px 10px 10px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.topbar-chat-title {
  font-size: 14.5px;
  font-weight: 550;
  color: #18181b;
  max-width: clamp(160px, 40vw, 480px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
  margin-left: 6px;
}
</style>
