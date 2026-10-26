<template>
  <DashboardLayout>
    <section class="section-page">
      <!-- Section Header -->
      <div class="section-head">
        <div>
          <div class="eyebrow">Workspaces &amp; Environments</div>
          <h1>Projects</h1>
          <p>Import an existing project folder from your local computer with the <strong>+</strong> button in the sidebar.</p>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="project-stats-grid">
        <div class="soft-card stat-card">
          <div class="stat-icon" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6;">
            <IconFolderCode :size="18" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Total Projects</span>
            <strong class="stat-value">{{ projectsStore.projects.length }}</strong>
          </div>
        </div>
        <div class="soft-card stat-card">
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.12); color: #10b981;">
            <IconGitFork :size="18" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Active Workflows</span>
            <strong class="stat-value">{{ totalLinkedTasks }}</strong>
          </div>
        </div>
        <div class="soft-card stat-card">
          <div class="stat-icon" style="background: rgba(139, 92, 246, 0.12); color: #8b5cf6;">
            <IconBox :size="18" />
          </div>
          <div class="stat-content">
            <span class="stat-label">Current Workspace</span>
            <strong class="stat-value">{{ activeProjectName }}</strong>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <label class="search-input-wrap">
          <IconSearch :size="15" />
          <input v-model="searchQuery" placeholder="Search projects by name, path or tag..." />
        </label>
        <span class="projects-count">{{ filteredProjects.length }} project{{ filteredProjects.length === 1 ? '' : 's' }}</span>
      </div>

      <!-- Projects Grid -->
      <div v-if="filteredProjects.length" class="projects-grid">
        <div
          v-for="proj in filteredProjects"
          :key="proj.id"
          class="soft-card project-card"
          :class="{ active: projectsStore.activeProjectId === proj.id }"
          @click="selectProject(proj.id)"
        >
          <div class="project-card-header">
            <div class="project-icon-box" :style="{ background: `${proj.color}18`, color: proj.color }">
              <IconFolderCode :size="20" />
            </div>
            <div class="project-header-right">
              <span v-if="projectsStore.activeProjectId === proj.id" class="active-badge">Active</span>
              <div class="project-actions" @click.stop>
                <button type="button" class="icon-action-btn danger" title="Delete project" @click="requestDeleteProject(proj)">
                  <IconTrash :size="14" />
                </button>
              </div>
            </div>
          </div>

          <div class="project-body">
            <h3 class="project-title">{{ proj.name }}</h3>
            <p class="project-description">{{ proj.description || 'No description provided.' }}</p>

            <div class="project-workspace-path" :title="proj.workspacePath">
              <IconTerminal2 :size="13" />
              <span>{{ proj.workspacePath }}</span>
            </div>

            <div v-if="proj.tags && proj.tags.length" class="project-tags">
              <span v-for="tag in proj.tags" :key="tag" class="tag-pill">{{ tag }}</span>
            </div>
          </div>

          <div class="project-card-footer" @click.stop>
            <button class="secondary-btn sm" type="button" @click="launchChat(proj)">
              <IconMessageCircle2 :size="13" />
              <span>Chat in Project</span>
            </button>
            <button class="secondary-btn sm" type="button" @click="launchWorkflow(proj)">
              <IconGitFork :size="13" />
              <span>Run DAG</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <IconFolderCode :size="36" style="color: #9ca3af; margin-bottom: 8px;" />
        <strong>No projects matched your search.</strong>
        <span>Use the + button beside Projects to upload a local project folder.</span>
      </div>
    </section>
    <ConfirmDialog
      :open="Boolean(projectToDelete)"
      title="Delete project?"
      :message="deleteProjectMessage"
      @confirm="confirmDeleteProject"
      @cancel="cancelDeleteProject"
    />
  </DashboardLayout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconFolderCode,
  IconGitFork,
  IconBox,
  IconSearch,
  IconTrash,
  IconTerminal2,
  IconMessageCircle2,
} from '@tabler/icons-vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useProjectsStore } from '@/stores/projects'
import { useChatStore } from '@/stores/chat'
const router = useRouter()
const projectsStore = useProjectsStore()
const chatStore = useChatStore()

const searchQuery = ref('')
const projectToDelete = ref(null)

const activeProjectName = computed(() => {
  return projectsStore.activeProject?.name || 'SMAgen'
})

const totalLinkedTasks = computed(() => {
  return projectsStore.projects.reduce((acc, p) => acc + (p.linkedItems?.length || 0), 0) + 3
})

const filteredProjects = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return projectsStore.projects
  return projectsStore.projects.filter((p) => {
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.workspacePath && p.workspacePath.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    )
  })
})

const deleteProjectMessage = computed(() => {
  return projectToDelete.value
    ? `Are you sure you want to delete "${projectToDelete.value.name}"? This action cannot be undone.`
    : ''
})

const requestDeleteProject = (project) => {
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

const selectProject = (id) => {
  projectsStore.activeProjectId = id
}

const launchChat = (proj) => {
  projectsStore.activeProjectId = proj.id
  chatStore.startNewChat()
  router.push({ name: 'chat' })
}

const launchWorkflow = (proj) => {
  projectsStore.activeProjectId = proj.id
  router.push({ name: 'workflows' })
}
</script>

<style scoped>
.project-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.stat-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-top: 2px;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 420px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #6b7280;
}

.search-input-wrap input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  width: 100%;
  color: #111827;
}

.projects-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
}

.project-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.project-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.project-card.active {
  border-color: #3b82f6;
  background: #fbfcfe;
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.project-icon-box {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.project-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.active-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.project-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-action-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.icon-action-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.icon-action-btn.danger:hover {
  color: #ef4444;
  background: #fee2e2;
}

.project-body {
  flex: 1;
  margin-bottom: 14px;
}

.project-title {
  font-size: 15px;
  font-weight: 650;
  color: #111827;
  margin: 0 0 6px;
}

.project-description {
  font-size: 12.5px;
  color: #6b7280;
  line-height: 1.45;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-workspace-path {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #4b5563;
  background: #f9fafb;
  padding: 4px 8px;
  border-radius: 6px;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag-pill {
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  background: #f3f4f6;
  color: #4b5563;
}

.project-card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  border-radius: 12px;
  border: 1px dashed #d1d5db;
  color: #6b7280;
}
</style>
