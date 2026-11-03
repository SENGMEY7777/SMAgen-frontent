import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'

const TOKEN_KEY = 'omni_token'
const USER_KEY = 'omni_user'
const ROLE_KEY = 'omni_role'
const AVATAR_KEY = 'omni_user_avatar'
const DEFAULT_AVATAR_URL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1a87AXvPKKu16P1lg-M-m7WVFNJwxmHQ22QEZw5_r6CqLI551y9Cr2P-U&s=10'

const readJson = (key, fallback = null) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(readJson(USER_KEY))
  const role = ref(localStorage.getItem(ROLE_KEY) || user.value?.role || 'DEVELOPER')
  const customAvatar = ref(localStorage.getItem(AVATAR_KEY) || '')
  const authError = ref('')
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  const isPrivileged = computed(() => ['ADMIN', 'OPERATOR'].includes(String(role.value).toUpperCase()))
  const displayName = computed(() => user.value?.full_name || user.value?.fullName || user.value?.email?.split('@')[0] || 'Developer')
  const initials = computed(() => displayName.value.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'OM')
  const hasCustomAvatar = computed(() => {
    return Boolean(
      customAvatar.value ||
      user.value?.avatar ||
      user.value?.avatar_url ||
      user.value?.avatarUrl ||
      user.value?.photoURL
    )
  })

  const avatar = computed(() => {
    return (
      customAvatar.value ||
      user.value?.avatar ||
      user.value?.avatar_url ||
      user.value?.avatarUrl ||
      user.value?.photoURL ||
      DEFAULT_AVATAR_URL
    )
  })

  const setAvatar = (newAvatarUrl) => {
    customAvatar.value = newAvatarUrl || ''
    if (user.value) {
      user.value = { ...user.value, avatar: newAvatarUrl || '' }
      localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    }
    if (newAvatarUrl) {
      localStorage.setItem(AVATAR_KEY, newAvatarUrl)
    } else {
      localStorage.removeItem(AVATAR_KEY)
    }
  }

  const setSession = (payload, selectedRole) => {
    const session = payload?.data || payload || {}
    token.value = session.token || ''
    user.value = session.user || null
    role.value = session.user?.role || selectedRole || 'DEVELOPER'
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value)
    if (user.value) localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    localStorage.setItem(ROLE_KEY, role.value)
    if (session.user?.avatar || session.user?.avatar_url) {
      customAvatar.value = session.user.avatar || session.user.avatar_url
      localStorage.setItem(AVATAR_KEY, customAvatar.value)
    }
  }

  const clearSession = () => {
    token.value = ''
    user.value = null
    role.value = 'DEVELOPER'
    customAvatar.value = ''
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(AVATAR_KEY)
  }

  const login = async ({ email, password, accountType = 'DEVELOPER' }) => {
    loading.value = true
    authError.value = ''
    try {
      const payload = accountType === 'ADMIN'
        ? await api.adminLogin({ email, password })
        : await api.developerLogin({ email, password })
      setSession(payload, accountType)
      return user.value
    } catch (error) {
      authError.value = error instanceof ApiError ? error.message : 'Login failed.'
      throw error
    } finally {
      loading.value = false
    }
  }

  const register = async (body) => {
    loading.value = true
    authError.value = ''
    try {
      return await api.developerRegister(body)
    } catch (error) {
      authError.value = error instanceof ApiError ? error.message : 'Registration failed.'
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      if (isAuthenticated.value) {
        if (isPrivileged.value) await api.adminLogout()
        else await api.developerLogout()
      }
    } catch (error) {
      // A failed remote logout must not keep the user signed in locally or
      // turn the sign-out button into an unhandled promise rejection.
      console.warn('Remote logout failed; clearing the local session.', error)
    } finally {
      clearSession()
    }
  }

  const resetError = () => { authError.value = '' }

  return {
    token,
    user,
    role,
    authError,
    loading,
    isAuthenticated,
    isPrivileged,
    displayName,
    initials,
    avatar,
    hasCustomAvatar,
    defaultAvatar: DEFAULT_AVATAR_URL,
    setAvatar,
    login,
    register,
    logout,
    clearSession,
    resetError,
  }
})
