<template>
  <section class="hero-content">
    <div class="hero-text" :class="{ visible: entered }">
      <h1 class="hero-headline">
        <span class="line">The schedule management</span>
        <span class="line dim">system for autonomous agents</span>
      </h1>

      <p class="hero-description">
        Coordinate work across every system, workflow, and agent.<br />
        Durable context loops keep every run informed and in control.
      </p>

      <div class="hero-buttons">
        <router-link to="/register" class="btn btn-outline">GET STARTED</router-link>
        <a href="#about" class="btn btn-solid">REQUEST A DEMO</a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const entered = ref(false)
onMounted(() => {
  setTimeout(() => (entered.value = true), 200)
})
</script>

<style scoped>
.hero-content {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 2rem;
  pointer-events: none;
}

.hero-text {
  text-align: center;
  max-width: 800px;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}

.hero-text.visible {
  opacity: 1;
  transform: translateY(0);
}

.hero-headline {
  font-size: clamp(2.2rem, 5.5vw, 4.2rem);
  font-weight: 300;
  line-height: 1.15;
  margin: 0 0 1.5rem;
  letter-spacing: -0.02em;
}

.hero-headline .line {
  display: block;
  color: #fff;
}

.hero-headline .line.dim {
  color: rgba(255, 255, 255, 0.5);
}

.hero-description {
  font-size: clamp(0.9rem, 1.3vw, 1.05rem);
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.7;
  margin: 0 0 2.5rem;
  font-weight: 300;
}

.hero-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  border-radius: 100px;
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.btn-outline {
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.45);
  transform: translateY(-1px);
}

.btn-solid {
  color: #050505;
  background: #fff;
  border: 1px solid #fff;
}

.btn-solid:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .hero-buttons {
    flex-direction: column;
  }
  .btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>
