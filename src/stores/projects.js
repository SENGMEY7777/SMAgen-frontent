import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const PROJECTS_STORAGE_KEY = 'kairo_projects'
const ACTIVE_PROJECT_STORAGE_KEY = 'kairo_active_project_id'

const DEFAULT_PROJECTS = [
  {
    id: 'proj_default_smagen',
    name: 'SMAgen Core Workspace',
    description: 'Main AI workflow orchestration, DAG generation, and agent runtime codebase.',
    color: '#3b82f6',
    workspacePath: '/Users/user/Documents/Project/SMAgen',
    tags: ['Core', 'Agent', 'Vue3'],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    linkedItems: [],
  },
  {
    id: 'proj_workflow_desktop',
    name: 'Run Workflow Desktop',
    description: 'Autonomous desktop directory management and Java background founder generator.',
    color: '#10b981',
    workspacePath: '~/Desktop/Run Workflow',
    tags: ['Desktop', 'Java', 'Automation'],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    linkedItems: [],
  },
  {
    id: 'proj_cloud_services',
    name: 'Production Cloud API',
    description: 'High-concurrency microservices, telemetry monitoring, and secure tool executors.',
    color: '#8b5cf6',
    workspacePath: '/api/v1/orchestrator',
    tags: ['API', 'Security', 'Telemetry'],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    linkedItems: [],
  },
]

const readStorage = () => {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!raw) return DEFAULT_PROJECTS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROJECTS
  } catch {
    return DEFAULT_PROJECTS
  }
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref(readStorage())
  const activeProjectId = ref(localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) || projects.value[0]?.id || null)

  watch(
    projects,
    (val) => {
      try {
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(val))
      } catch {}
    },
    { deep: true }
  )

  watch(activeProjectId, (val) => {
    try {
      if (val) {
        localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, String(val))
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY)
      }
    } catch {}
  })

  const activeProject = computed(() => {
    return projects.value.find((p) => p.id === activeProjectId.value) || projects.value[0] || null
  })

  const createProject = ({ name, description = '', color = '#3b82f6', workspacePath = '', tags = [] }) => {
    const newProj = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: description.trim(),
      color,
      workspacePath: workspacePath.trim() || '/workspace',
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedItems: [],
    }
    projects.value.unshift(newProj)
    activeProjectId.value = newProj.id
    return newProj
  }

  const updateProject = (id, patch) => {
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      projects.value[idx] = {
        ...projects.value[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      }
    }
  }

  const deleteProject = (id) => {
    projects.value = projects.value.filter((p) => p.id !== id)
    if (activeProjectId.value === id) {
      activeProjectId.value = projects.value[0]?.id || null
    }
  }

  const assignItemToProject = (itemId, projectId) => {
    const proj = projects.value.find((p) => p.id === projectId)
    if (proj) {
      if (!proj.linkedItems) proj.linkedItems = []
      if (!proj.linkedItems.includes(itemId)) {
        proj.linkedItems.push(itemId)
        proj.updatedAt = new Date().toISOString()
      }
    }
  }

  return {
    projects,
    activeProjectId,
    activeProject,
    createProject,
    updateProject,
    deleteProject,
    assignItemToProject,
  }
})
