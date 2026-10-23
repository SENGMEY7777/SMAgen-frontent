<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">History</div>
          <h1>Everything you’ve run.</h1>
          <p>Follow each goal from its first prompt to the last task log.</p>
        </div>
        <button class="secondary-btn" type="button" @click="load">
          <IconClock :size="14" /> Refresh
        </button>
      </div>

      <!-- Clean Filter Pills -->
      <div class="filter-bar">
        <button
          v-for="item in ['ALL', 'RUNNING', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL']"
          :key="item"
          class="filter-pill"
          :class="{ active: filter === item }"
          type="button"
          @click="setFilter(item)"
        >
          <span>{{ item.replace(/_/g, ' ') }}</span>
          <span class="filter-count">{{ filterCounts[item] ?? 0 }}</span>
        </button>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>
      <div v-if="loading" class="empty-state">Loading your run history…</div>
      <div v-else-if="!filteredRuns.length" class="empty-state">
        <strong>No matching runs.</strong>
        Start a workflow from Home to see it here.
      </div>
      <div v-else class="data-list">
        <article v-for="run in paginatedRuns" :key="run.id" class="data-row">
          <div class="row-main">
            <div class="row-title" :title="run.goal_prompt">{{ run.goal_prompt }}</div>
            <div class="row-meta">
              <span>{{ formatDate(run.created_at) }}</span>
              <span>·</span>
              <span>{{ formatTokens(run.total_tokens) }} tokens</span>
            </div>
          </div>
          <div class="row-actions">
            <StatusPill :status="run.status" />
            <RouterLink class="secondary-btn sm" :to="`/runs/${run.id}`">
              View run <IconArrowRight :size="12" />
            </RouterLink>
          </div>
        </article>
      </div>

      <!-- Pagination 10/page -->
      <nav v-if="totalPages > 1" class="pagination-bar" aria-label="Runs pagination">
        <div class="pagination-info">
          Showing <strong>{{ (currentPage - 1) * pageSize + 1 }}</strong>–<strong>{{ Math.min(currentPage * pageSize, filteredRuns.length) }}</strong> of <strong>{{ filteredRuns.length }}</strong> runs
        </div>
        <div class="pagination-controls">
          <button
            class="pagination-btn"
            type="button"
            :disabled="currentPage === 1"
            aria-label="Previous page"
            @click="currentPage--"
          >
            <IconChevronLeft :size="15" />
            <span>Previous</span>
          </button>

          <div class="page-numbers">
            <template v-for="(p, idx) in displayedPages" :key="idx">
              <span v-if="p === '...'" class="page-ellipsis">…</span>
              <button
                v-else
                class="page-number-btn"
                :class="{ active: currentPage === p }"
                type="button"
                @click="currentPage = p"
              >
                {{ p }}
              </button>
            </template>
          </div>

          <button
            class="pagination-btn"
            type="button"
            :disabled="currentPage === totalPages"
            aria-label="Next page"
            @click="currentPage++"
          >
            <span>Next</span>
            <IconChevronRight :size="15" />
          </button>
        </div>
      </nav>
    </section>
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import {
  IconClock,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, ApiError } from '@/services/api'
import { formatDate, formatTokens } from '@/utils/formatters'

const runs = ref([])
const loading = ref(true)
const errorMessage = ref('')
const filter = ref('ALL')
const currentPage = ref(1)
const pageSize = ref(10)

const setFilter = (newFilter) => {
  filter.value = newFilter
  currentPage.value = 1
}

const filteredRuns = computed(() => {
  return filter.value === 'ALL'
    ? runs.value
    : runs.value.filter((run) => run.status === filter.value)
})

const filterCounts = computed(() => ({
  ALL: runs.value.length,
  RUNNING: runs.value.filter((r) => r.status === 'RUNNING').length,
  COMPLETED: runs.value.filter((r) => r.status === 'COMPLETED').length,
  FAILED: runs.value.filter((r) => r.status === 'FAILED').length,
  AWAITING_APPROVAL: runs.value.filter((r) => r.status === 'AWAITING_APPROVAL').length,
}))

const totalPages = computed(() => Math.ceil(filteredRuns.value.length / pageSize.value) || 1)

const paginatedRuns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRuns.value.slice(start, start + pageSize.value)
})

const displayedPages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    pages.push(current - 1)
    pages.push(current)
    pages.push(current + 1)
    pages.push('...')
    pages.push(total)
  }
  return pages
})

const load = async () => {
  loading.value = true
  try {
    const response = await api.listRuns()
    runs.value = response?.data || []
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load run history.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 22px;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

.filter-pill.active {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}

.filter-count {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  transition: all 0.15s ease;
}

.filter-pill.active .filter-count {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* Data Row & Text Truncation */
.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  width: 100%;
}

.row-main {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.row-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  color: #111827;
  font-size: 14px;
  font-weight: 650;
  margin-bottom: 3px;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.secondary-btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* Pagination Bar */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 13px;
  color: #6b7280;
}

.pagination-info strong {
  color: #111827;
  font-weight: 600;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #374151;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

.pagination-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #fafafa;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-number-btn {
  display: grid;
  place-items: center;
  min-width: 34px;
  height: 34px;
  padding: 0 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #4b5563;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-number-btn:hover:not(.active) {
  background: #f3f4f6;
  color: #111827;
}

.page-number-btn.active {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}

.page-ellipsis {
  display: grid;
  place-items: center;
  width: 28px;
  height: 34px;
  color: #9ca3af;
  font-size: 13px;
}

@media (max-width: 640px) {
  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .pagination-controls {
    justify-content: space-between;
  }
}
</style>
