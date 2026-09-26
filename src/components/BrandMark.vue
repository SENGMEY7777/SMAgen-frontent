<template>
  <span class="brand-mark" aria-hidden="true">
    <svg class="kairo-orb-logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Outer Glow Filter -->
        <filter id="kairoOrbGlow" x="-25%" y="-25%" width="150%" height="150%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#3B82F6" flood-opacity="0.4" />
        </filter>
        
        <!-- Main Sphere Radial Gradient -->
        <radialGradient id="kairoOrbBody" cx="35%" cy="30%" r="65%" fx="30%" fy="25%">
          <stop offset="0%" stop-color="#60A5FA" />
          <stop offset="40%" stop-color="#3B82F6" />
          <stop offset="78%" stop-color="#2563EB" />
          <stop offset="100%" stop-color="#1D4ED8" />
        </radialGradient>

        <!-- Glass Rim Highlight -->
        <linearGradient id="kairoGlassRim" x1="16" y1="6" x2="32" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8" />
          <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.15" />
          <stop offset="70%" stop-color="#38BDF8" stop-opacity="0" />
          <stop offset="100%" stop-color="#60A5FA" stop-opacity="0.45" />
        </linearGradient>

        <!-- Top White Specular Dot -->
        <radialGradient id="kairoTopHighlight" cx="45%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
          <stop offset="65%" stop-color="#E0F2FE" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#BAE6FD" stop-opacity="0" />
        </radialGradient>

        <!-- Bottom Cyan Glowing Dot -->
        <radialGradient id="kairoBottomCyan" cx="40%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#A5F3FC" stop-opacity="0.95" />
          <stop offset="55%" stop-color="#38BDF8" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#0284C7" stop-opacity="0.45" />
        </radialGradient>
      </defs>

      <!-- Main Glowing 3D Orb -->
      <circle cx="24" cy="24" r="19" fill="url(#kairoOrbBody)" filter="url(#kairoOrbGlow)" />
      
      <!-- Subtle Glass Specular Border -->
      <circle cx="24" cy="24" r="18.3" stroke="url(#kairoGlassRim)" stroke-width="1.2" fill="none" />

      <!-- Top-left White Highlight Bubble -->
      <ellipse cx="20.5" cy="15" rx="3.6" ry="3.2" fill="url(#kairoTopHighlight)" />

      <!-- Bottom-right Glowing Cyan Bubble -->
      <circle cx="27.5" cy="28.5" r="4.8" fill="url(#kairoBottomCyan)" />
      <circle cx="26.3" cy="27.3" r="1.4" fill="#FFFFFF" fill-opacity="0.75" />
    </svg>
  </span>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.kairo-orb-logo {
  width: 100%;
  height: 100%;
  display: block;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease;
}

.brand:hover .kairo-orb-logo {
  transform: scale(1.08) rotate(6deg);
}
</style>
