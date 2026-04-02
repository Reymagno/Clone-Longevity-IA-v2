'use client'

import { useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Types ──────────────────────────────────────────────────────
type Phase = 'idle' | 'recording' | 'transcribing' | 'analyzing' | 'done' | 'error'

interface StarSceneProps {
  phase: Phase
  onClick: () => void
  disabled?: boolean
}

// ── Phase-based colors ────────────────────────────────────────
function phaseColor(phase: Phase): THREE.Color {
  switch (phase) {
    case 'recording':    return new THREE.Color(0.83, 0.33, 0.42)
    case 'transcribing': return new THREE.Color(0.36, 0.64, 0.79)
    case 'analyzing':    return new THREE.Color(0.18, 0.68, 0.48)
    case 'done':         return new THREE.Color(0.18, 0.68, 0.48)
    case 'error':        return new THREE.Color(0.83, 0.33, 0.42)
    default:             return new THREE.Color(0.83, 0.69, 0.22)
  }
}

function phaseCSS(phase: Phase): string {
  switch (phase) {
    case 'recording':    return '212,83,106'
    case 'transcribing': return '91,164,201'
    case 'analyzing':
    case 'done':         return '46,174,123'
    case 'error':        return '212,83,106'
    default:             return '212,175,55'
  }
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'recording':    return 'RECORDING'
    case 'transcribing': return 'TRANSCRIBING'
    case 'analyzing':    return 'ANALYZING'
    case 'done':         return 'DONE'
    default:             return ''
  }
}

// ── Central Orb ───────────────────────────────────────────────
// Smooth breathing sphere — the visual anchor
function CentralOrb({ phase }: { phase: Phase }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.025)

    // Gentle breathing — slow sine
    const breatheSpeed = phase === 'recording' ? 1.6 : 0.8
    const breatheAmp = phase === 'recording' ? 0.08 : 0.04
    const s = 1 + Math.sin(t * breatheSpeed) * breatheAmp
    meshRef.current.scale.setScalar(s)

    // Slow rotation
    meshRef.current.rotation.y += 0.002
    meshRef.current.rotation.x = Math.sin(t * 0.15) * 0.05

    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.color.copy(currentColor.current)
    mat.emissive.copy(currentColor.current)
    mat.emissiveIntensity = 0.5 + Math.sin(t * breatheSpeed) * 0.2

    // Outer glow shell
    const glowS = s * 1.4 + Math.sin(t * breatheSpeed * 0.6) * 0.04
    glowRef.current.scale.setScalar(glowS)
    const glowMat = glowRef.current.material as THREE.MeshBasicMaterial
    glowMat.color.copy(currentColor.current)
    glowMat.opacity = 0.06 + Math.sin(t * breatheSpeed) * 0.03

    // Light
    lightRef.current.color.copy(currentColor.current)
    const baseI = phase === 'recording' ? 3.0 : 1.5
    lightRef.current.intensity = baseI + Math.sin(t * breatheSpeed) * 0.8
  })

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          emissive={new THREE.Color(0.83, 0.69, 0.22)}
          emissiveIntensity={0.6}
          roughness={0.12}
          metalness={0.9}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent opacity={0.07} toneMapped={false} depthWrite={false}
        />
      </mesh>
      <pointLight ref={lightRef} intensity={2} distance={10} decay={2} />
    </>
  )
}

// ── Sound Wave Rings ──────────────────────────────────────────
// Concentric torus rings that expand smoothly outward
function SoundWaves({ phase }: { phase: Phase }) {
  const ringsRef = useRef<THREE.Group>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const RING_COUNT = 6

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.025)

    const isRecording = phase === 'recording'
    const speed = isRecording ? 0.8 : 0.3
    const maxScale = isRecording ? 5.0 : 3.0
    const baseOpacity = isRecording ? 0.18 : 0.06

    ringsRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.copy(currentColor.current)

      const progress = ((t * speed + i * (1.0 / RING_COUNT)) % 1)
      // Ease-out for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 2)
      const scale = 0.8 + eased * maxScale
      mesh.scale.set(scale, scale, 1)
      mat.opacity = baseOpacity * (1 - eased * 0.95)
    })
  })

  return (
    <group ref={ringsRef}>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <mesh key={i}>
          <torusGeometry args={[0.5, 0.008, 8, 80]} />
          <meshBasicMaterial
            color={new THREE.Color(0.83, 0.69, 0.22)}
            transparent opacity={0.1}
            toneMapped={false} depthWrite={false} side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Floating Particles ────────────────────────────────────────
// Gentle particles orbiting around the orb
function FloatingParticles({ phase, count = 300 }: { phase: Phase; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const { positions, speeds, radii, offsets } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const rad = new Float32Array(count)
    const off = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 1.0 + Math.random() * 2.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      spd[i] = 0.05 + Math.random() * 0.2
      rad[i] = r
      off[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, radii: rad, offsets: off }
  }, [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.025)

    const speedMult = phase === 'recording' ? 1.2 : 0.4
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const r = radii[i] + Math.sin(t * 0.3 + offsets[i]) * 0.2
      const speed = speeds[i] * speedMult
      const angle = t * speed + offsets[i]
      const phi = Math.acos(2 * ((i / count + t * 0.01 * speeds[i]) % 1) - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(angle)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(angle)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    posAttr.needsUpdate = true

    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.color.copy(currentColor.current)
    mat.opacity = phase === 'recording' ? 0.6 : 0.35
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        transparent
        color={new THREE.Color(0.83, 0.69, 0.22)}
        size={0.015}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
        opacity={0.45}
      />
    </points>
  )
}

// ── Orbiting Ring ─────────────────────────────────────────────
// A single elegant ring orbiting the orb
function OrbitRing({ phase }: { phase: Phase }) {
  const ringRef = useRef<THREE.Mesh>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.025)

    ringRef.current.rotation.x = t * 0.15 + 0.4
    ringRef.current.rotation.y = t * 0.1
    ringRef.current.rotation.z = Math.sin(t * 0.2) * 0.3

    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.color.copy(currentColor.current)
    mat.opacity = 0.08 + Math.sin(t * 0.8) * 0.03
  })

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[1.5, 0.006, 8, 100]} />
      <meshBasicMaterial
        color={new THREE.Color(0.83, 0.69, 0.22)}
        transparent opacity={0.1}
        toneMapped={false} depthWrite={false}
      />
    </mesh>
  )
}

// ── Glow Layers ───────────────────────────────────────────────
function GlowLayers({ phase }: { phase: Phase }) {
  const l1Ref = useRef<THREE.Mesh>(null!)
  const l2Ref = useRef<THREE.Mesh>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.025)

    const speed = phase === 'recording' ? 1.6 : 0.8
    const amp = phase === 'recording' ? 0.08 : 0.03

    l1Ref.current.scale.setScalar(2.0 + Math.sin(t * speed) * amp)
    const m1 = l1Ref.current.material as THREE.MeshBasicMaterial
    m1.color.copy(currentColor.current)
    m1.opacity = 0.035 + Math.sin(t * speed) * 0.015

    l2Ref.current.scale.setScalar(3.0 + Math.sin(t * speed * 0.6 + 0.5) * amp * 1.5)
    const m2 = l2Ref.current.material as THREE.MeshBasicMaterial
    m2.color.copy(currentColor.current)
    m2.opacity = 0.015 + Math.sin(t * speed * 0.6 + 0.5) * 0.008
  })

  return (
    <>
      <mesh ref={l1Ref}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent opacity={0.035} toneMapped={false} depthWrite={false}
        />
      </mesh>
      <mesh ref={l2Ref}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent opacity={0.015} toneMapped={false} depthWrite={false}
        />
      </mesh>
    </>
  )
}

// ── Main Scene Export ──────────────────────────────────────────
export function StarScene({ phase, onClick, disabled }: StarSceneProps) {
  const handleClick = useCallback(() => {
    if (!disabled) onClick()
  }, [disabled, onClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') onClick()
  }, [onClick])

  const c = phaseCSS(phase)
  const isRecording = phase === 'recording'
  const label = phaseLabel(phase)

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ width: 420, height: 420, maxWidth: '100%', aspectRatio: '1 / 1' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.08} />
        <CentralOrb phase={phase} />
        <SoundWaves phase={phase} />
        <FloatingParticles phase={phase} />
        <OrbitRing phase={phase} />
        <GlowLayers phase={phase} />
      </Canvas>

      {/* Phase label overlay */}
      {label && (
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-16">
          <span
            className="text-xs font-bold tracking-[0.35em] uppercase animate-breathe"
            style={{
              color: `rgba(${c},0.7)`,
              textShadow: `0 0 12px rgba(${c},0.3)`,
            }}
          >
            {label}
          </span>
        </div>
      )}

      {/* Radial glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${c},${isRecording ? 0.1 : 0.05}) 0%, rgba(${c},0.01) 45%, transparent 70%)`,
          filter: 'blur(25px)',
        }}
      />

      {/* Subtle ring */}
      <div
        className="absolute inset-4 rounded-full pointer-events-none"
        style={{
          border: `1px solid rgba(${c},${isRecording ? 0.12 : 0.04})`,
          animation: isRecording
            ? 'voiceRecorderPulse 2s ease-in-out infinite'
            : 'voiceRecorderPulse 5s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes voiceRecorderPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.015); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
