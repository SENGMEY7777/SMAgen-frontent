<template>
  <div ref="containerRef" class="animated-bg" @mousemove="onMouseMove" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const containerRef = ref(null)
const mouse = { x: 0, y: 0 }
let renderer, scene, camera, animationId
let hourglassLines, particles

function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
}

function createHourglassGeometry(lineCount, pointsPerLine) {
  const positions = new Float32Array(lineCount * pointsPerLine * 3)
  const opacities = new Float32Array(lineCount * pointsPerLine)

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2
    const radiusVariation = 0.8 + Math.random() * 0.4
    const phaseOffset = Math.random() * Math.PI * 2

    for (let j = 0; j < pointsPerLine; j++) {
      const t = (j / (pointsPerLine - 1)) * 2 - 1 // -1 to 1
      const idx = (i * pointsPerLine + j) * 3

      // Hourglass shape: wide at top/bottom, narrow at center
      const pinch = Math.cos(t * Math.PI * 0.5)
      const radius = (2.8 + Math.sin(t * Math.PI * 3 + phaseOffset) * 0.3) * (0.15 + Math.abs(t) * 0.85) * radiusVariation

      positions[idx] = Math.cos(angle + t * 0.3) * radius
      positions[idx + 1] = t * 4.5
      positions[idx + 2] = Math.sin(angle + t * 0.3) * radius

      // Opacity: brighter at extremes, dimmer at center
      opacities[i * pointsPerLine + j] = 0.1 + Math.abs(t) * 0.5 + pinch * 0.2
    }
  }

  return { positions, opacities }
}

function createParticles(count) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const speeds = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const t = Math.random() * 2 - 1
    const radius = (2.8 + Math.random() * 0.5) * (0.15 + Math.abs(t) * 0.85)

    positions[i * 3] = Math.cos(angle) * radius * (0.8 + Math.random() * 0.4)
    positions[i * 3 + 1] = t * 4.5
    positions[i * 3 + 2] = Math.sin(angle) * radius * (0.8 + Math.random() * 0.4)

    sizes[i] = 1.5 + Math.random() * 3
    speeds[i] = 0.2 + Math.random() * 0.8
  }

  return { positions, sizes, speeds }
}

function init() {
  const container = containerRef.value
  if (!container) return

  const w = container.clientWidth
  const h = container.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050505)

  // Camera
  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100)
  camera.position.set(0, 0, 12)

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // --- Hourglass Lines ---
  const lineCount = 120
  const pointsPerLine = 80
  const { positions: linePositions, opacities } = createHourglassGeometry(lineCount, pointsPerLine)

  for (let i = 0; i < lineCount; i++) {
    const lineGeo = new THREE.BufferGeometry()
    const linePos = new Float32Array(pointsPerLine * 3)
    const lineOp = new Float32Array(pointsPerLine)

    for (let j = 0; j < pointsPerLine; j++) {
      const srcIdx = (i * pointsPerLine + j) * 3
      linePos[j * 3] = linePositions[srcIdx]
      linePos[j * 3 + 1] = linePositions[srcIdx + 1]
      linePos[j * 3 + 2] = linePositions[srcIdx + 2]
      lineOp[j] = opacities[i * pointsPerLine + j]
    }

    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08 + Math.random() * 0.07,
      blending: THREE.AdditiveBlending,
    })

    const line = new THREE.Line(lineGeo, lineMat)
    line.userData = {
      basePositions: new Float32Array(linePos),
      index: i,
      speed: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    }
    scene.add(line)
  }

  hourglassLines = scene.children.filter((c) => c instanceof THREE.Line)

  // --- Glowing Particles ---
  const particleCount = 600
  const pData = createParticles(particleCount)
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pData.positions, 3))
  particleGeo.setAttribute('size', new THREE.BufferAttribute(pData.sizes, 1))

  const particleMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffffff) },
    },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        pos.y += sin(uTime * 0.5 + position.x * 2.0) * 0.1;
        pos.x += cos(uTime * 0.3 + position.z * 1.5) * 0.05;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (6.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
        float dist = length(pos.xz);
        vAlpha = 0.15 + smoothstep(0.0, 3.0, dist) * 0.4;
        vAlpha *= 0.5 + 0.5 * sin(uTime + position.y * 0.5);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, vAlpha * glow * 0.6);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  particles = new THREE.Points(particleGeo, particleMat)
  particles.userData.speeds = pData.speeds
  particles.userData.basePositions = new Float32Array(pData.positions)
  scene.add(particles)

  animate()
}

function animate() {
  animationId = requestAnimationFrame(animate)

  const time = performance.now() * 0.001

  // Animate hourglass lines
  if (hourglassLines) {
    hourglassLines.forEach((line) => {
      const { basePositions, speed, phase } = line.userData
      const pos = line.geometry.attributes.position.array
      const pointsPerLine = basePositions.length / 3

      for (let j = 0; j < pointsPerLine; j++) {
        const t = (j / (pointsPerLine - 1)) * 2 - 1
        const wave = Math.sin(time * speed + t * 3 + phase) * 0.15
        const wave2 = Math.cos(time * speed * 0.7 + t * 2 + phase) * 0.1

        pos[j * 3] = basePositions[j * 3] + wave
        pos[j * 3 + 1] = basePositions[j * 3 + 1] + wave2 * 0.3
        pos[j * 3 + 2] = basePositions[j * 3 + 2] + wave * 0.5
      }

      line.geometry.attributes.position.needsUpdate = true
    })
  }

  // Animate particles
  if (particles) {
    particles.material.uniforms.uTime.value = time
    const pos = particles.geometry.attributes.position.array
    const base = particles.userData.basePositions
    const speeds = particles.userData.speeds
    const count = pos.length / 3

    for (let i = 0; i < count; i++) {
      const s = speeds[i]
      pos[i * 3] = base[i * 3] + Math.sin(time * s + i) * 0.15
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.cos(time * s * 0.5 + i * 0.5) * 0.1
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.sin(time * s * 0.3 + i * 1.5) * 0.1
    }

    particles.geometry.attributes.position.needsUpdate = true
  }

  // Mouse-responsive camera sway
  camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.02
  camera.position.y += (mouse.y * 0.3 - camera.position.y) * 0.02
  camera.lookAt(0, 0, 0)

  // Slow global rotation
  scene.rotation.y = time * 0.05

  renderer.render(scene, camera)
}

function onResize() {
  const container = containerRef.value
  if (!container || !renderer) return
  const w = container.clientWidth
  const h = container.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

onMounted(() => {
  init()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
    containerRef.value?.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.animated-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
</style>
