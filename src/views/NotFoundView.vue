<template>
  <main class="not-found-page">
    <div class="not-found-card">
      <div class="not-found-code">404</div>
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist or may have moved.</p>
      <RouterLink class="primary-btn" :to="homeRoute">Return to workspace</RouterLink>
    </div>
  </main>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const homeRoute = { name: 'chat' }
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f7f7f8;
}

.not-found-card {
  width: min(440px, 100%);
  padding: 42px 32px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 48px rgb(15 23 42 / 8%);
  text-align: center;
}

.not-found-code {
  margin-bottom: 8px;
  color: #7c3aed;
  font-size: 54px;
  font-weight: 800;
  letter-spacing: -0.08em;
  line-height: 1;
}

.not-found-card h1 {
  margin: 0 0 10px;
  color: #18181b;
  font-size: 24px;
}

.not-found-card p {
  margin: 0 0 24px;
  color: #71717a;
}
</style>
