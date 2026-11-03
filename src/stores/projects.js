import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const PROJECTS_STORAGE_KEY = 'kairo_projects'
const ACTIVE_PROJECT_STORAGE_KEY = 'kairo_active_project_id'

const STATIC_PROJECT_IDS = new Set([
  'proj_default_smagen',
  'proj_workflow_desktop',
  'proj_cloud_services',
])

const readStorage = () => {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p) => p && p.id && !STATIC_PROJECT_IDS.has(p.id))
  } catch {
    return []
  }
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref(readStorage())
  const storedActiveId = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)
  const initialActiveId = storedActiveId && !STATIC_PROJECT_IDS.has(storedActiveId) ? storedActiveId : null
  const activeProjectId = ref(initialActiveId)

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
