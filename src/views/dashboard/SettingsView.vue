<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, apiBaseUrl, ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const apiKey = ref('')
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

const createKey = async () => {
  loading.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const response = auth.isPrivileged ? await api.createAdminApiKey() : await api.createDeveloperApiKey()
    apiKey.value = response?.data?.apiKey || ''
    message.value = 'Store this key now. It will not be shown again.'
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to create an API key.'
  } finally {
    loading.value = false
  }
}

const copyKey = async () => {
  if (apiKey.value) {
    await navigator.clipboard?.writeText(apiKey.value)
    message.value = 'API key copied to clipboard.'
  }
}

const logout = async () => {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <DashboardLayout>
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Workspace</div>
          <h1>Settings</h1>
          <p>Manage your account, API access, and the connection to the SMAgen backend.</p>
        </div>
      </div>

      <div class="settings-grid">
        <div class="soft-card">
          <div class="eyebrow">Profile</div>
          <div class="profile-line">
            <span class="avatar large-avatar">{{ auth.initials }}</span>
            <div>
              <h3>{{ auth.displayName }}</h3>
              <p>{{ auth.user?.email }}</p>
              <StatusPill status="APPROVED" :label="auth.role" />
            </div>
          </div>
          <div class="setting-line">
            <span>API base URL</span>
            <code>{{ apiBaseUrl }}</code>
          </div>
          <div class="setting-line">
            <span>Session</span>
            <StatusPill status="APPROVED" label="Authenticated" />
          </div>
        </div>

        <div class="soft-card">
          <div class="eyebrow">Developer access</div>
          <h3>Create an API key</h3>
          <p>Keys are returned once. Keep the value private and rotate it if it is exposed.</p>
          <button class="secondary-btn key-button" type="button" :disabled="loading" @click="createKey">
            <AppIcon name="shield" :size="15" />
            {{ loading ? 'Creating…' : 'Create API key' }}
          </button>
          <div v-if="apiKey" class="key-box">
            <code>{{ apiKey }}</code>
            <button class="secondary-btn" type="button" @click="copyKey">Copy</button>
          </div>
          <div v-if="message" class="success-text">{{ message }}</div>
          <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>
        </div>
      </div>

      <button class="danger-btn logout-button" type="button" @click="logout">
        <AppIcon name="logout" :size="15" /> Sign out
      </button>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 900px;
}

.profile-line {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 10px 0 22px;
}

.large-avatar {
  width: 50px;
  height: 50px;
  font-size: 15px;
}

.profile-line h3 {
  margin: 0 0 3px;
}

.profile-line p {
  margin: 0 0 8px;
  color: #9ba0aa;
  font-size: 12px;
}

.setting-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid #f0f1f4;
  color: #888c96;
  font-size: 12px;
}

.setting-line code {
  color: #666a75;
  font-size: 10px;
}

.soft-card > h3 {
  margin-top: 3px;
}

.soft-card > p {
  margin-bottom: 17px;
}

.key-button {
  margin-top: 3px;
}

.soft-card .key-box {
  margin-top: 15px;
}

.success-text {
  margin-top: 10px;
  color: #2b946d;
  font-size: 11px;
}

.logout-button {
  margin-top: 20px;
}

@media (max-width: 740px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
