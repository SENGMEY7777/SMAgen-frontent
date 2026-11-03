<template>
  <section class="integrations" :class="{ visible: entered }">
    <div class="integrations-inner">
      <div class="integrations-track">
        <div v-for="brand in brands" :key="brand.name" class="brand-mark" :title="brand.name">
          <component :is="brand.icon" v-if="brand.icon" />
          <span v-else class="brand-text">{{ brand.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'

const entered = ref(false)

onMounted(() => {
  setTimeout(() => (entered.value = true), 1200)
})

// SVG icon components for each brand
const SlackIcon = {
  render: () =>
    h('svg', { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'currentColor' }, [
      h('path', { d: 'M7.5 0a2.5 2.5 0 0 0 0 5h2.5V2.5A2.5 2.5 0 0 0 7.5 0zM2.5 7.5a2.5 2.5 0 0 0 0 5H5v-2.5A2.5 2.5 0 0 0 2.5 7.5zM12.5 5a2.5 2.5 0 0 0 0-5A2.5 2.5 0 0 0 10 2.5V5h2.5zM10 12.5A2.5 2.5 0 0 0 12.5 15H15v-2.5A2.5 2.5 0 0 0 12.5 10H10v2.5zM5 12.5A2.5 2.5 0 0 0 7.5 15a2.5 2.5 0 0 0 2.5-2.5V10H7.5A2.5 2.5 0 0 0 5 12.5zM15 7.5A2.5 2.5 0 0 0 17.5 10a2.5 2.5 0 0 0 0-5H15v2.5z' }),
    ]),
}

const GitHubIcon = {
  render: () =>
    h('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'currentColor' }, [
      h('path', { d: 'M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z' }),
    ]),
}

const brands = [
  { name: 'Slack', icon: SlackIcon },
  { name: 'Supabase', label: 'supabase' },
  { name: 'GitHub', icon: GitHubIcon },
  { name: 'HubSpot', label: 'HubSpot' },
  { name: 'Zapier', label: 'zapier' },
  { name: 'Snowflake', label: '❄ snowflake' },
  { name: 'AWS', label: 'aws' },
  { name: 'S3', label: 'S3' },
  { name: 'Stripe', label: 'stripe' },
  { name: 'Vercel', label: '▲ Vercel' },
]
</script>

<style scoped>
.integrations {
  position: fixed;
  bottom: 3rem;
  left: 0;
  right: 0;
  z-index: 10;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.integrations.visible {
  opacity: 1;
  transform: translateY(0);
}

.integrations-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 2rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.integrations-inner::-webkit-scrollbar {
  display: none;
}

.integrations-track {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  min-width: max-content;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.82rem;
  font-weight: 400;
  letter-spacing: 0.5px;
  white-space: nowrap;
  transition: color 0.3s;
  cursor: default;
}

.brand-mark:hover {
  color: rgba(255, 255, 255, 0.6);
}

.brand-text {
  font-family: inherit;
}

@media (max-width: 768px) {
  .integrations {
    bottom: 2rem;
  }
  .integrations-track {
    justify-content: flex-start;
    gap: 2rem;
    padding: 0 1rem;
  }
}
</style>
