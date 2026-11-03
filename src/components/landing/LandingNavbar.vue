<template>
  <nav class="landing-nav" :class="{ scrolled: isScrolled }">
    <div class="nav-inner">
      <!-- Logo -->
      <router-link to="/" class="nav-logo">
        <BrandMark />
        <span class="logo-text">KAIRO</span>
      </router-link>

      <!-- Center Nav Links -->
      <div class="nav-links" :class="{ open: mobileOpen }">
        <a v-for="link in links" :key="link" :href="`#${link.toLowerCase()}`" class="nav-link" @click="mobileOpen = false">
          {{ link }}
        </a>
      </div>

      <!-- CTA -->
      <div class="nav-actions">
        <router-link to="/login" class="nav-cta">GET STARTED</router-link>
      </div>

      <!-- Mobile Toggle -->
      <button class="mobile-toggle" @click="mobileOpen = !mobileOpen" aria-label="Toggle navigation">
        <span :class="{ active: mobileOpen }">
          <i /><i /><i />
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BrandMark from '@/components/branding/BrandMark.vue'

const links = ['About', 'Features', 'Insights', 'Pricing', 'Testimonials']
const isScrolled = ref(false)
const mobileOpen = ref(false)

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => window.addEventListener('scroll', handleScroll))
onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll))
</script>

<style scoped>
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0 2rem;
  transition: background 0.4s, backdrop-filter 0.4s;
}

.landing-nav.scrolled {
  background: rgba(5, 5, 5, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #fff;
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 3px;
  color: #fff;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  letter-spacing: 0.5px;
  transition: color 0.3s;
  font-weight: 400;
}

.nav-link:hover {
  color: #fff;
}

.nav-cta {
  font-size: 0.78rem;
  color: #fff;
  text-decoration: none;
  padding: 8px 22px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 100px;
  letter-spacing: 1.5px;
  font-weight: 500;
  transition: all 0.3s;
}

.nav-cta:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.5);
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.mobile-toggle span {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 22px;
}

.mobile-toggle i {
  display: block;
  height: 1.5px;
  background: #fff;
  border-radius: 2px;
  transition: all 0.3s;
}

.mobile-toggle span.active i:nth-child(1) {
  transform: rotate(45deg) translate(4px, 4px);
}

.mobile-toggle span.active i:nth-child(2) {
  opacity: 0;
}

.mobile-toggle span.active i:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
    position: fixed;
    top: 72px;
    left: 0;
    right: 0;
    background: rgba(5, 5, 5, 0.95);
    backdrop-filter: blur(20px);
    flex-direction: column;
    padding: 2rem;
    gap: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .nav-links.open {
    display: flex;
  }

  .nav-actions {
    display: none;
  }

  .mobile-toggle {
    display: block;
  }
}
</style>
