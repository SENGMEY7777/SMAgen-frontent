<script setup>
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import AppIcon from '@/components/common/AppIcon.vue'
</script>

<template>
  <DashboardLayout>
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Explore</div>
          <h1>Make space for better work.</h1>
          <p>Everything in KAIRO is designed to turn a rough idea into a clear next step.</p>
        </div>
      </div>
      <div class="card-grid">
        <article class="soft-card">
          <div class="feature-icon">
            <AppIcon name="spark" :size="19" />
          </div>
          <h3>Ask SMAgen</h3>
          <p>Get a clear answer with context, examples, and the next move already in view.</p>
          <RouterLink class="feature-link" to="/">Start a chat
            <AppIcon name="arrow" :size="14" />
          </RouterLink>
        </article>
        <article class="soft-card">
          <div class="feature-icon green">
            <AppIcon name="play" :size="18" />
          </div>
          <h3>Run a workflow</h3>
          <p>Describe a goal and let the planner break it into safe, observable task nodes.</p>
          <RouterLink class="feature-link" to="/">Build a workflow
            <AppIcon name="arrow" :size="14" />
          </RouterLink>
        </article>
        <article class="soft-card">
          <div class="feature-icon orange">
            <AppIcon name="shield" :size="18" />
          </div>
          <h3>Human checkpoints</h3>
          <p>Risky actions pause for review, so important decisions stay visible and accountable.</p>
          <RouterLink class="feature-link" to="/approvals">Review approvals
            <AppIcon name="arrow" :size="14" />
          </RouterLink>
        </article>
      </div>
      <div class="soft-card explore-banner">
        <div>
          <div class="eyebrow">Designed for focus</div>
          <h2>From “what if?” to “done.”</h2>
          <p>Chat for thinking. Workflows for doing. History and telemetry for knowing what happened.</p>
        </div>
        <div class="banner-orb"></div>
      </div>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.explore-banner {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: space-between;
  min-height: 180px;
  margin-top: 18px;
  overflow: hidden;
}

.explore-banner h2 {
  margin: 4px 0 8px;
  color: #2d2e36;
  font-size: 25px;
  letter-spacing: -.04em;
}

.explore-banner p {
  max-width: 460px;
  margin: 0;
  color: #9699a3;
  font-size: 13px;
}

.banner-orb {
  width: 160px;
  height: 160px;
  margin-right: 35px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 26%, #e5dcff, transparent 24%), linear-gradient(135deg, #8174ff, #74d9db);
  box-shadow: 0 18px 45px rgba(112, 112, 255, .24);
  transform: rotate(20deg);
}
</style>
