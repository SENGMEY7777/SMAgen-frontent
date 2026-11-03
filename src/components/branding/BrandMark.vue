<template>
  <span class="brand-mark" aria-hidden="true">
    <img
      :src="logoUrl"
      alt="KAIRO Logo"
      class="kairo-logo-img"
    />
  </span>
</template>

<script setup>
import logoUrl from '@/assets/logo-kairo.png'
</script>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  background: #09090b;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
}

.kairo-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.brand:hover .brand-mark {
  transform: scale(1.08);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1);
}
</style>
