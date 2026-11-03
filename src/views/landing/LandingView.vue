<template>
  <main class="landing-page">
    <LandingNavbar />
    <div class="hero-container">
      <AnimatedBackground />
      <HeroContent />
    </div>
    <IntegrationPartners />
  </main>
</template>

<script setup>
import LandingNavbar from '@/components/landing/LandingNavbar.vue'
import AnimatedBackground from '@/components/landing/AnimatedBackground.vue'
import HeroContent from '@/components/landing/HeroContent.vue'
import IntegrationPartners from '@/components/landing/IntegrationPartners.vue'
</script>

<style scoped>
.landing-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: #050505;
  color: #ffffff;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.hero-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
