<script setup>
import { ref } from 'vue'
import DashboardLayout from '../components/DashboardLayout.vue'
import AppIcon from '../components/AppIcon.vue'

const tools = ref([
  {
    id: 'shell',
    name: 'Shell Command Sandbox',
    category: 'System & CLI',
    description: 'Execute isolated bash/sh commands inside Docker or secure local workspace sandbox.',
    enabled: true,
    securityTier: 'HITL Required',
    securityColor: 'orange',
    icon: 'terminal',
    callsCount: 142,
    endpoint: '/api/v1/tools/shell',
  },
  {
    id: 'mysql',
    name: 'MySQL / SQL Database',
    category: 'Databases',
    description: 'Query relational tables, introspect schemas, and run read/write queries with approval.',
    enabled: true,
    securityTier: 'HITL Required',
    securityColor: 'orange',
    icon: 'database',
    callsCount: 89,
    endpoint: '/api/v1/tools/sql',
  },
  {
    id: 'websearch',
    name: 'WebSearch (Google & Docs)',
    category: 'Search & Research',
    description: 'Retrieve live web results, developer documentation, and real-time technical answers.',
    enabled: true,
    securityTier: 'Safe / Read-Only',
    securityColor: 'green',
    icon: 'search',
    callsCount: 318,
    endpoint: '/api/v1/tools/websearch',
  },
  {
    id: 'http',
    name: 'HTTP & REST Client',
    category: 'Networking',
    description: 'Perform authenticated outbound REST/GraphQL API requests, webhooks, and payload tests.',
    enabled: true,
    securityTier: 'Safe / Sandboxed',
    securityColor: 'blue',
    icon: 'globe',
    callsCount: 64,
    endpoint: '/api/v1/tools/http',
  },
  {
    id: 'sandbox',
    name: 'Code Sandbox & Runner',
    category: 'Execution',
    description: 'Run Python, Node.js, and JS snippets in an isolated runtime environment.',
    enabled: true,
    securityTier: 'Safe / Sandboxed',
    securityColor: 'blue',
    icon: 'code',
    callsCount: 205,
    endpoint: '/api/v1/tools/sandbox',
  },
  {
    id: 'filesystem',
    name: 'Workspace File System',
    category: 'Storage',
    description: 'Read and write artifacts, generate reports, and manage source files in workspace.',
    enabled: true,
    securityTier: 'Safe / Workspace',
    securityColor: 'green',
    icon: 'folder',
    callsCount: 512,
    endpoint: '/api/v1/tools/fs',
  },
])

const toggleTool = (tool) => {
  tool.enabled = !tool.enabled
}

const statusMessage = ref('')

const saveConfiguration = () => {
  statusMessage.value = 'Tool integration settings updated successfully.'
  setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
}
</script>

<template>
  <DashboardLayout>
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Integrations</div>
          <h1>Tool Integrations</h1>
          <p>Configure agent capabilities, manage execution privileges, and monitor tool usage.</p>
        </div>
        <button class="primary-btn" type="button" @click="saveConfiguration">
          <AppIcon name="check" :size="14" /> Save Changes
        </button>
      </div>

      <div v-if="statusMessage" class="inline-success">{{ statusMessage }}</div>

      <!-- Overview Header Cards -->
      <div class="stats-grid">
        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Active Tools</span>
            <span class="stat-badge green">{{ tools.filter(t => t.enabled).length }}/{{ tools.length }}</span>
          </div>
          <div class="stat-value">{{ tools.filter(t => t.enabled).length }} Active</div>
          <div class="stat-desc">Available to KAIRO reasoning engine</div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Invocations</span>
            <span class="stat-badge blue">1,330</span>
          </div>
          <div class="stat-value">1,330 calls</div>
          <div class="stat-desc">Past 30 days execution volume</div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">HITL Protected</span>
            <span class="stat-badge orange">2 Tools</span>
          </div>
          <div class="stat-value">Shell & SQL</div>
          <div class="stat-desc">Requires human authorization gate</div>
        </div>
      </div>

      <!-- Tools Grid -->
      <div class="tools-grid">
        <article
          v-for="tool in tools"
          :key="tool.id"
          class="soft-card tool-card"
          :class="{ disabled: !tool.enabled }"
        >
          <div class="tool-card-header">
            <div class="tool-badge-wrap">
              <div class="tool-icon">
                <AppIcon :name="tool.icon" :size="18" />
              </div>
              <div>
                <h3 class="tool-title">{{ tool.name }}</h3>
                <span class="tool-cat">{{ tool.category }}</span>
              </div>
            </div>

            <!-- Clean Switch Toggle -->
            <label class="switch-toggle" :title="tool.enabled ? 'Disable tool' : 'Enable tool'">
              <input type="checkbox" :checked="tool.enabled" @change="toggleTool(tool)" />
              <span class="slider round"></span>
            </label>
          </div>

          <p class="tool-desc">{{ tool.description }}</p>

          <div class="tool-footer">
            <span class="security-tag" :class="tool.securityColor">
              <AppIcon name="shield" :size="12" /> {{ tool.securityTier }}
            </span>
            <span class="calls-count">{{ tool.callsCount }} calls</span>
          </div>
        </article>
      </div>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 16px 18px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #6b7280;
}

.stat-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

.stat-badge.green { background: #dcfce7; color: #15803d; }
.stat-badge.blue { background: #dbeafe; color: #1d4ed8; }
.stat-badge.orange { background: #ffedd5; color: #c2410c; }

.stat-value {
  font-size: 24px;
  font-weight: 750;
  color: #111827;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.stat-desc {
  margin-top: 5px;
  font-size: 11.5px;
  color: #9ca3af;
}

.inline-success {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 18px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}

.tool-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.tool-card.disabled {
  opacity: 0.65;
  background: #f9fafb;
}

.tool-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tool-badge-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-icon {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: #eef2ff;
  color: #4f46e5;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.tool-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 650;
  color: #111827;
}

.tool-cat {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.tool-desc {
  font-size: 12.5px;
  color: #4b5563;
  line-height: 1.45;
  margin: 0 0 16px;
  flex: 1;
}

.tool-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.security-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.security-tag.orange { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
.security-tag.green { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
.security-tag.blue { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }

.calls-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* Switch Toggle Styling */
.switch-toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.switch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: 0.2s;
  border-radius: 22px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

input:checked + .slider {
  background-color: #4f46e5;
}

input:checked + .slider:before {
  transform: translateX(18px);
}
</style>
