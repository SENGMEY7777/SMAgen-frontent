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
            <div
              class="avatar-container"
              @click="triggerFileInput"
              title="Click to change photo"
              role="button"
              tabindex="0"
              @keydown.enter="triggerFileInput"
              @keydown.space.prevent="triggerFileInput"
            >
              <span class="avatar large-avatar" :class="{ 'has-img': avatarSrc && !avatarError }">
                <img
                  v-if="avatarSrc && !avatarError"
                  :src="avatarSrc"
                  :alt="auth.displayName"
                  class="avatar-img"
                  @error="handleAvatarError"
                />
                <span v-else>{{ auth.initials }}</span>
              </span>
              <div class="avatar-edit-overlay">
                <IconCamera :size="18" />
              </div>
            </div>

            <div class="profile-info">
              <div class="profile-header-line">
                <h3>{{ auth.displayName }}</h3>
                <StatusPill status="APPROVED" :label="auth.role" />
              </div>
              <p>{{ auth.user?.email }}</p>

              <div class="avatar-buttons">
                <button class="avatar-btn" type="button" @click="triggerFileInput">
                  <IconUpload :size="13" />
                  <span>{{ auth.hasCustomAvatar ? 'Change photo' : 'Upload photo' }}</span>
                </button>
                <button
                  v-if="auth.hasCustomAvatar"
                  class="avatar-btn avatar-btn-danger"
                  type="button"
                  @click="removeAvatar"
                  title="Reset to default avatar image"
                >
                  <IconTrash :size="13" />
                  <span>Reset to default</span>
                </button>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden-file-input"
                @change="handleFileUpload"
              />
            </div>
          </div>

          <div v-if="avatarSuccess" class="success-text">{{ avatarSuccess }}</div>
          <div v-if="avatarErrorMsg" class="inline-error">{{ avatarErrorMsg }}</div>

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
            <IconShieldCheck :size="15" />
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
        <IconLogout :size="15" /> Sign out
      </button>
    </section>
  </DashboardLayout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { IconShieldCheck, IconLogout, IconCamera, IconUpload, IconTrash } from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, apiBaseUrl, ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const apiKey = ref('')
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

const fileInputRef = ref(null)
const avatarError = ref(false)
const avatarSuccess = ref('')
const avatarErrorMsg = ref('')
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

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileUpload = (event) => {
  const file = event.target?.files?.[0]
  if (!file) return

  avatarErrorMsg.value = ''
  avatarSuccess.value = ''

  if (!file.type.startsWith('image/')) {
    avatarErrorMsg.value = 'Please select a valid image file.'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    avatarErrorMsg.value = 'Image size should be less than 5MB.'
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result
    if (dataUrl) {
      avatarError.value = false
      auth.setAvatar(dataUrl)
      avatarSuccess.value = 'Profile picture updated successfully.'
      setTimeout(() => {
        avatarSuccess.value = ''
      }, 4000)
    }
  }
  reader.onerror = () => {
    avatarErrorMsg.value = 'Failed to read image file.'
  }
  reader.readAsDataURL(file)

  event.target.value = ''
}

const removeAvatar = () => {
  auth.setAvatar('')
  avatarError.value = false
  avatarSuccess.value = 'Profile picture removed. Using initials badge.'
  setTimeout(() => {
    avatarSuccess.value = ''
  }, 4000)
}

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
  gap: 16px;
  padding: 12px 0 20px;
}

.avatar-container {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  flex: 0 0 auto;
}

.large-avatar {
  width: 54px;
  height: 54px;
  font-size: 16px;
  transition: transform 0.15s ease;
}

.avatar-container:hover .large-avatar {
  transform: scale(1.03);
}

.avatar-edit-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.avatar-container:hover .avatar-edit-overlay {
  opacity: 1;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-header-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.profile-header-line h3 {
  margin: 0;
}

.profile-info p {
  margin: 0 0 10px;
  color: #9ba0aa;
  font-size: 12px;
}

.avatar-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.avatar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.avatar-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.avatar-btn-danger {
  color: #dc2626;
  border-color: #fee2e2;
  background: #fef2f2;
}

.avatar-btn-danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.hidden-file-input {
  display: none;
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
