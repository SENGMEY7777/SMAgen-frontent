<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { IconClock, IconArrowRight } from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, ApiError } from '@/services/api'
import { formatDate, formatTokens } from '@/utils/formatters'

const runs = ref([])
const loading = ref(true)
const errorMessage = ref('')
const filter = ref('ALL')
const filteredRuns = computed(() => {
  return filter.value === 'ALL'
    ? runs.value
    : runs.value.filter((run) => run.status === filter.value)
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
          <IconClock :size="15" /> Refresh
        </button>
      </div>

      <div class="filter-bar">
        <button
          v-for="item in ['ALL', 'RUNNING', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL']"
          :key="item"
          class="mode-chip"
          :class="{ active: filter === item }"
          type="button"
          @click="filter = item"
        >
          {{ item.replace(/_/g, ' ') }}
        </button>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>
      <div v-if="loading" class="empty-state">Loading your run history…</div>
      <div v-else-if="!filteredRuns.length" class="empty-state">
        <strong>No matching runs.</strong>
        Start a workflow from Home to see it here.
      </div>
      <div v-else class="data-list">
        <article v-for="run in filteredRuns" :key="run.id" class="data-row">
          <div class="row-main">
            <div class="row-title">{{ run.goal_prompt }}</div>
            <div class="row-meta">
              {{ formatDate(run.created_at) }} · {{ formatTokens(run.total_tokens) }} tokens
            </div>
          </div>
          <div class="row-actions">
            <StatusPill :status="run.status" />
            <RouterLink class="secondary-btn" :to="`/runs/${run.id}`">
              View run <IconArrowRight :size="13" />
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: -7px 0 18px;
}
.filter-bar .mode-chip {
  border-radius: 999px;
}
</style>

