<script setup>
defineProps({ name: { type: String, default: 'spark' }, size: { type: [Number, String], default: 20 } })
</script>

<template>
  <svg class="app-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'search'"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></template>
    <template v-else-if="name === 'home'"><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></template>
    <template v-else-if="name === 'chat' || name === 'chat-dots'"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><circle cx="8.5" cy="10" r="0.8" fill="currentColor" /><circle cx="12" cy="10" r="0.8" fill="currentColor" /><circle cx="15.5" cy="10" r="0.8" fill="currentColor" /></template>
    <template v-else-if="name === 'diagram' || name === 'workflow'"><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><path d="M8.7 16.5 15.3 7.5M8.7 18h6.6" /></template>
    <template v-else-if="name === 'folder' || name === 'artifacts'"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><path d="M2 10h20" /></template>
    <template v-else-if="name === 'graph' || name === 'telemetry'"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></template>
    <template v-else-if="name === 'tools'"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></template>
    <template v-else-if="name === 'compass'"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /></template>
    <template v-else-if="name === 'library'"><path d="M4 5h16v14H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></template>
    <template v-else-if="name === 'clock'"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.4 1.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L9 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H7v-2h.8a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L9 9l1.4-1.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V6h2v.4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L20 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2h-.2a1.7 1.7 0 0 0-1.8 1Z" /></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></template>
    <template v-else-if="name === 'upload'"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></template>
    <template v-else-if="name === 'send'"><path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z" /><path d="M10.3 13.7 21 3" /></template>
    <template v-else-if="name === 'mic'"><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></template>
    <template v-else-if="name === 'paperclip'"><path d="m20.5 11.5-8.7 8.7a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.2-8.2" /></template>
    <template v-else-if="name === 'spark'"><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></template>
    <template v-else-if="name === 'bulb'"><path d="M9 18h6M10 21h4" /><path d="M8.5 14.5a6 6 0 1 1 7 0c-.8.6-1.2 1.3-1.3 2.5h-4.4c-.1-1.2-.5-1.9-1.3-2.5Z" /></template>
    <template v-else-if="name === 'image'"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 4.5-4.5 3.5 3 2.5-2.5L20 18" /></template>
    <template v-else-if="name === 'book'"><path d="M4 5a3 3 0 0 1 3-3h12v17H7a3 3 0 0 0-3 3V5Z" /><path d="M4 19a3 3 0 0 1 3-3h12M8 6h7M8 10h7" /></template>
    <template v-else-if="name === 'shield'"><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.3 2.3 4.7-5" /></template>
    <template v-else-if="name === 'play'"><path d="m8 5 11 7-11 7V5Z" /></template>
    <template v-else-if="name === 'check'"><path d="m5 12 4 4L19 6" /></template>
    <template v-else-if="name === 'copy'"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></template>
    <template v-else-if="name === 'arrow'"><path d="M5 12h14M13 6l6 6-6 6" /></template>
    <template v-else-if="name === 'chevron-down'"><path d="m6 9 6 6 6-6" /></template>
    <template v-else-if="name === 'close'"><path d="m6 6 12 12M18 6 6 18" /></template>
    <template v-else-if="name === 'menu'"><path d="M4 7h16M4 12h16M4 17h16" /></template>
    <template v-else-if="name === 'terminal'"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></template>
    <template v-else-if="name === 'database'"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></template>
    <template v-else-if="name === 'globe'"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></template>
    <template v-else-if="name === 'code'"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></template>
    <template v-else-if="name === 'edit' || name === 'pencil'"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></template>
    <template v-else-if="name === 'refresh' || name === 'retry'"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" /><polyline points="21 3 21 8 16 8" /></template>
    <template v-else-if="name === 'dots-vertical' || name === 'more'"><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="19" r="1.5" /></template>
    <template v-else-if="name === 'pin'"><path d="M12 17v5M5 17h14l-2-7V4h1V2H6v2h1v6l-2 7z" /></template>
    <template v-else-if="name === 'stack' || name === 'project'"><path d="m4 6 8-4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4" /><path d="m4 18 8 4 8-4" /></template>
    <template v-else-if="name === 'trash' || name === 'delete'"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></template>
    <template v-else-if="name === 'chevron-right'"><polyline points="9 18 15 12 9 6" /></template>
    <template v-else-if="name === 'logout'"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></template>
    <template v-else-if="name === 'stop'"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" /></template>
    <template v-else-if="name === 'arrow-up'"><path d="M12 19V5M5 12l7-7 7 7" stroke-width="2.2" /></template>
    <template v-else-if="name === 'starburst' || name === 'claude' || name === 'asterisk'"><path d="M12 2.5v19M2.5 12h19M5.28 5.28l13.44 13.44M5.28 18.72 18.72 5.28M3.68 8.08l16.64 7.84M3.68 15.92l16.64-7.84M8.08 3.68l7.84 16.64M15.92 3.68 8.08 20.32" stroke-width="2.2" stroke-linecap="round" /></template>
    <template v-else><circle cx="12" cy="12" r="8" /></template>
  </svg>
</template>
