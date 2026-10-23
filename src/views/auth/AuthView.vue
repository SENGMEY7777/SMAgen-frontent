<template>
  <div class="auth-page">
    <section class="auth-art">
      <div class="brand">
        <BrandMark />
        <span>KAIRO</span>
      </div>
      <div class="art-copy">
        <h1>Make work<br /><em>feel lighter.</em></h1>
        <p>One calm workspace for questions, safe automations, and workflows that keep moving.</p>
      </div>
      <span class="art-foot">SMAgen workspace · Secure by design</span>
    </section>

    <section class="auth-panel">
      <form class="auth-form" @submit.prevent="submit">
        <div class="brand">
          <BrandMark />
          <span>KAIRO</span>
        </div>
        <h2>{{ isRegister ? 'Create your account' : 'Welcome back' }}</h2>
        <p class="lead">
          {{ isRegister ? 'Start building calmer, smarter workflows.' : 'Sign in to continue to your workspace.' }}
        </p>

        <div v-if="!isRegister" class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: accountType === 'DEVELOPER' }"
            type="button"
            @click="accountType = 'DEVELOPER'; formError = ''; auth.resetError()"
          >
            Developer
          </button>
          <button
            class="auth-tab"
            :class="{ active: accountType === 'ADMIN' }"
            type="button"
            @click="accountType = 'ADMIN'; formError = ''; auth.resetError()"
          >
            Admin / Operator
          </button>
        </div>

        <div v-if="(formError || auth.authError) && countdownSeconds > 0" class="auth-error countdown-box">
          <IconClock :size="15" class="countdown-icon" />
          <span>Too many authentication attempts. Please try again in <strong>{{ formatCountdown(countdownSeconds) }}</strong>.</span>
        </div>
        <div v-else-if="formError || auth.authError" class="auth-error">
          {{ formError || auth.authError }}
        </div>
        <div v-if="verificationMessage" class="auth-success">
          {{ verificationMessage }}
        </div>

        <template v-if="!registered">
          <div v-if="isRegister" class="field">
            <label for="name">Full name</label>
            <input id="name" v-model="fullName" required autocomplete="name" placeholder="Alex Rivers" />
          </div>

          <div class="field" :style="{ marginTop: isRegister ? '15px' : '0' }">
            <label for="email">Email address</label>
            <input id="email" v-model="email" required type="email" autocomplete="email" placeholder="you@example.com" />
          </div>

          <div class="field" style="margin-top: 15px">
            <label for="password">Password</label>
            <div class="password-input">
              <input
                id="password"
                v-model="password"
                required
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                placeholder="••••••••"
              />
              <button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <small v-if="isRegister" class="password-hint">
              8+ characters, uppercase, lowercase, number, and special character
            </small>
          </div>

          <div v-if="isRegister" class="field" style="margin-top: 15px">
            <label for="confirm">Confirm password</label>
            <input
              id="confirm"
              v-model="confirmPassword"
              required
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
            />
          </div>

          <button class="auth-submit" type="submit" :disabled="auth.loading || countdownSeconds > 0">
            {{ auth.loading ? 'Please wait…' : (countdownSeconds > 0 ? `Try again in ${formatCountdown(countdownSeconds)}` : (isRegister ? 'Create account' : 'Sign in')) }}
          </button>
        </template>

        <template v-else>
          <div class="field">
            <label for="verify-token">Verification token</label>
            <input id="verify-token" v-model="verificationToken" placeholder="Paste the token from your email" />
          </div>
          <div class="form-actions">
            <button class="secondary-btn" type="button" @click="resend">Resend email</button>
            <button class="primary-btn" type="button" @click="verify">Verify email</button>
          </div>
        </template>

        <p class="auth-switch">
          {{ isRegister ? 'Already have an account?' : 'New to KAIRO?' }}
          <RouterLink :to="isRegister ? '/login' : '/register'">
            {{ isRegister ? 'Sign in' : 'Create an account' }}
          </RouterLink>
        </p>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { IconClock } from '@tabler/icons-vue'
import BrandMark from '@/components/branding/BrandMark.vue'
import { isInternalRedirect } from '@/app/router'
import { api, ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  mode: { type: String, default: 'login' },
})

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const accountType = ref('DEVELOPER')
const email = ref('')
const password = ref('')
const fullName = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const verificationToken = ref('')
const registered = ref(false)
const verificationMessage = ref('')
const formError = ref('')

const countdownSeconds = ref(0)
let countdownTimer = null

const startCountdown = (seconds = 900) => {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownSeconds.value = Math.max(1, Math.round(seconds))
  countdownTimer = setInterval(() => {
    countdownSeconds.value -= 1
    if (countdownSeconds.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
      formError.value = ''
      auth.resetError()
    }
  }, 1000)
}

const formatCountdown = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m > 0) {
    return `${m}m ${s < 10 ? '0' : ''}${s}s`
  }
  return `${s}s`
}

const parseSecondsFromText = (text) => {
  if (!text || typeof text !== 'string') return null
  const match = text.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i)
  if (match) return Number.parseInt(match[1], 10)
  return null
}

watch(
  () => formError.value || auth.authError,
  (newVal) => {
    if (newVal && (newVal.includes('Too many authentication attempts') || newVal.includes('rate limit'))) {
      if (countdownSeconds.value <= 0) {
        const parsed = parseSecondsFromText(newVal)
        startCountdown(parsed || 900)
      }
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

const isRegister = computed(() => props.mode === 'register')

const submit = async () => {
  if (countdownSeconds.value > 0) return
  formError.value = ''
  verificationMessage.value = ''
  auth.resetError()
  email.value = email.value.trim()

  if (isRegister.value) {
    if (password.value !== confirmPassword.value) {
      formError.value = 'Passwords do not match.'
      return
    }
    try {
      await auth.register({
        full_name: fullName.value,
        email: email.value,
        password: password.value,
      })
      registered.value = true
      verificationMessage.value = 'Account created. Check your email for the verification link, then sign in.'
    } catch (error) {
      if (error?.status === 429 || error?.code === 'AUTH_RATE_LIMITED' || error?.retryAfter) {
        startCountdown(error.retryAfter || parseSecondsFromText(error.message) || 900)
      }
      formError.value = error instanceof ApiError ? error.message : 'Registration failed.'
    }
    return
  }

  try {
    await auth.login({
      email: email.value,
      password: password.value,
      accountType: accountType.value,
    })
    const redirect = String(route.query.redirect || '')
    router.replace(isInternalRedirect(redirect) ? redirect : { name: 'chat' })
  } catch (error) {
    if (error?.status === 429 || error?.code === 'AUTH_RATE_LIMITED' || error?.retryAfter) {
      startCountdown(error.retryAfter || parseSecondsFromText(error.message) || 900)
    }
    formError.value = error instanceof ApiError ? error.message : 'Login failed.'
  }
}

const verify = async () => {
  formError.value = ''
  try {
    await api.verifyEmail(verificationToken.value.trim())
    verificationMessage.value = 'Email verified. You can sign in now.'
    registered.value = false
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : 'Verification failed.'
  }
}

const resend = async () => {
  formError.value = ''
  try {
    await api.resendVerification(email.value)
    verificationMessage.value = 'A new verification link has been sent.'
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : 'Unable to resend verification email.'
  }
}
</script>

<style scoped>
.auth-art em {
  color: #b9c5ff;
  font-style: normal;
}

.auth-panel .field {
  margin-top: 0;
}

.password-input {
  display: flex;
  align-items: center;
  border: 1px solid #e7e9ef;
  border-radius: 10px;
  background: #fbfcfd;
}

.password-input:focus-within {
  border-color: #bbb6ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.08);
}

.password-input input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
}

.password-input input:focus {
  box-shadow: none;
}

.password-input button {
  padding: 10px 12px;
  color: #635bff;
  background: transparent;
  font-size: 11px;
  font-weight: 750;
}

.countdown-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
  font-weight: 500;
  line-height: 1.45;
}

.countdown-icon {
  flex-shrink: 0;
  color: #e11d48;
}

.countdown-box strong {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #9f1239;
}

.auth-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
