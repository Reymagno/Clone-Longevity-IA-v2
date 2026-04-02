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
    case 'recording':    return new THREE.Color(0.83, 0.33, 0.42)  // #D4536A
    case 'transcribing': return new THREE.Color(0.36, 0.64, 0.79)  // #5BA4C9
    case 'analyzing':    return new THREE.Color(0.18, 0.68, 0.48)  // #2EAE7B
    case 'done':         return new THREE.Color(0.18, 0.68, 0.48)  // #2EAE7B
    case 'error':        return new THREE.Color(0.83, 0.33, 0.42)  // #D4536A
    default:             return new THREE.Color(0.83, 0.69, 0.22)  // #D4AF37 gold
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

// ── 3D Microphone Body ────────────────────────────────────────
// Capsule shape with emissive glow, wireframe shell, and inner light
function MicrophoneBody({ phase }: { phase: Phase }) {
  const capsuleRef = useRef<THREE.Mesh>(null!)
  const wireRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const pulseSpeed = phase === 'recording' ? 3.0 : phase === 'idle' ? 1.0 : 1.8
    const pulseAmp = phase === 'recording' ? 0.06 : 0.025

    // Capsule body subtle pulse
    const s = 1 + Math.sin(t * pulseSpeed) * pulseAmp
    capsuleRef.current.scale.set(s, s, s)

    const mat = capsuleRef.current.material as THREE.MeshStandardMaterial
    mat.color.copy(currentColor.current)
    mat.emissive.copy(currentColor.current)
    mat.emissiveIntensity = 0.3 + Math.sin(t * pulseSpeed) * 0.15

    // Wireframe shell rotates slowly
    wireRef.current.rotation.y += 0.004
    wireRef.current.rotation.x = Math.sin(t * 0.3) * 0.1
    const wireMat = wireRef.current.material as THREE.MeshBasicMaterial
    wireMat.color.copy(currentColor.current)
    wireMat.opacity = 0.1 + Math.sin(t * 1.5) * 0.04

    // Inner glow sphere
    const innerMat = innerRef.current.material as THREE.MeshBasicMaterial
    innerMat.color.copy(currentColor.current)
    innerMat.opacity = 0.15 + Math.sin(t * pulseSpeed) * 0.08
    const innerS = 0.95 + Math.sin(t * pulseSpeed * 1.2) * 0.03
    innerRef.current.scale.setScalar(innerS)

    // Point light
    lightRef.current.color.copy(currentColor.current)
    const baseIntensity = phase === 'recording' ? 4.0 : phase === 'idle' ? 1.5 : 2.5
    lightRef.current.intensity = baseIntensity + Math.sin(t * pulseSpeed) * 1.0
  })

  return (
    <group position={[0, 0.35, 0]}>
      {/* Inner glow */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent
          opacity={0.15}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Solid capsule (mic head) */}
      <mesh ref={capsuleRef}>
        <capsuleGeometry args={[0.4, 0.5, 16, 24]} />
        <meshStandardMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          emissive={new THREE.Color(0.83, 0.69, 0.22)}
          emissiveIntensity={0.4}
          roughness={0.15}
          metalness={0.9}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      {/* Wireframe shell around mic head */}
      <mesh ref={wireRef}>
        <capsuleGeometry args={[0.48, 0.55, 8, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          wireframe
          transparent
          opacity={0.12}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Center point light */}
      <pointLight ref={lightRef} intensity={2} distance={8} decay={2} />
    </group>
  )
}

// ── Mic Stand ─────────────────────────────────────────────────
function MicStand({ phase }: { phase: Phase }) {
  const standRef = useRef<THREE.Mesh>(null!)
  const baseRef = useRef<THREE.Mesh>(null!)
  const arcRef = useRef<THREE.Line>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  // Half-circle arc geometry
  const arcGeo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 32; i++) {
      const angle = Math.PI + (Math.PI * i) / 32
      pts.push(new THREE.Vector3(
        Math.cos(angle) * 0.45,
        Math.sin(angle) * 0.3 + 0.1,
        0
      ))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  const arcLine = useMemo(() => {
    return new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(0.83, 0.69, 0.22),
        transparent: true,
        opacity: 0.2,
      })
    )
  }, [arcGeo])

  useFrame(() => {
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const standMat = standRef.current.material as THREE.MeshStandardMaterial
    standMat.color.copy(currentColor.current)
    standMat.emissive.copy(currentColor.current)

    const baseMat = baseRef.current.material as THREE.MeshStandardMaterial
    baseMat.color.copy(currentColor.current)
    baseMat.emissive.copy(currentColor.current)

    if (arcRef.current) {
      const arcMat = arcRef.current.material as THREE.LineBasicMaterial
      arcMat.color.copy(currentColor.current)
    }
  })

  return (
    <group>
      {/* Vertical stand */}
      <mesh ref={standRef} position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 12]} />
        <meshStandardMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          emissive={new THREE.Color(0.83, 0.69, 0.22)}
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Base disk */}
      <mesh ref={baseRef} position={[0, -0.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 24]} />
        <meshStandardMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          emissive={new THREE.Color(0.83, 0.69, 0.22)}
          emissiveIntensity={0.1}
          roughness={0.4}
          metalness={0.7}
          transparent
          opacity={0.4}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Arc cradle */}
      <primitive ref={arcRef} object={arcLine} />
    </group>
  )
}

// ── Sound Wave Rings ──────────────────────────────────────────
// Concentric rings that expand outward from the mic — voice wave effect
function SoundWaves({ phase }: { phase: Phase }) {
  const ringsRef = useRef<THREE.Group>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const RING_COUNT = 5

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const isRecording = phase === 'recording'
    const speed = isRecording ? 1.2 : 0.4
    const maxScale = isRecording ? 4.0 : 2.5
    const baseOpacity = isRecording ? 0.2 : 0.08

    ringsRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.copy(currentColor.current)

      // Each ring has a staggered phase in the expansion cycle
      const progress = ((t * speed + i * (1.0 / RING_COUNT)) % 1)
      const scale = 0.6 + progress * maxScale
      mesh.scale.set(scale, scale, 1)

      // Fade out as it expands
      mat.opacity = baseOpacity * (1 - progress * 0.9)
    })
  })

  return (
    <group ref={ringsRef} position={[0, 0.35, 0]}>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <mesh key={i} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.5, 0.01, 8, 64]} />
          <meshBasicMaterial
            color={new THREE.Color(0.83, 0.69, 0.22)}
            transparent
            opacity={0.1}
            toneMapped={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Audio Waveform Bars ───────────────────────────────────────
// Vertical bars around the mic that react like a waveform/equalizer
function WaveformBars({ phase }: { phase: Phase }) {
  const barsRef = useRef<THREE.Group>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const BAR_COUNT = 28
  const RADIUS = 1.3

  const barData = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => ({
      angle: (i / BAR_COUNT) * Math.PI * 2,
      speed: 1.5 + Math.random() * 2.5,
      offset: Math.random() * Math.PI * 2,
      baseHeight: 0.1 + Math.random() * 0.15,
    }))
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const isRecording = phase === 'recording'
    const isProcessing = phase === 'transcribing' || phase === 'analyzing'
    const heightMult = isRecording ? 3.5 : isProcessing ? 2.0 : 0.8
    const speedMult = isRecording ? 1.5 : isProcessing ? 1.0 : 0.4

    barsRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.copy(currentColor.current)

      const bar = barData[i]
      const wave = Math.abs(Math.sin(t * bar.speed * speedMult + bar.offset))
      const height = bar.baseHeight + wave * 0.4 * heightMult

      mesh.scale.y = height
      mesh.position.y = 0.35 // Center on mic head

      // Opacity based on height
      mat.opacity = 0.15 + wave * 0.25
    })
  })

  return (
    <group ref={barsRef}>
      {barData.map((bar, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(bar.angle) * RADIUS,
            0.35,
            Math.sin(bar.angle) * RADIUS,
          ]}
          rotation={[0, -bar.angle + Math.PI / 2, 0]}
        >
          <boxGeometry args={[0.04, 1, 0.02]} />
          <meshBasicMaterial
            color={new THREE.Color(0.83, 0.69, 0.22)}
            transparent
            opacity={0.2}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Floating Audio Particles ──────────────────────────────────
// Small particles that float upward from the mic like sound being captured
function AudioParticles({ phase, count = 200 }: { phase: Phase; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const { positions, speeds, offsets } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const off = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // Start near mic head
      const angle = Math.random() * Math.PI * 2
      const r = 0.3 + Math.random() * 0.8
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = Math.random() * 3.0 - 0.5
      pos[i * 3 + 2] = Math.sin(angle) * r
      spd[i] = 0.3 + Math.random() * 0.8
      off[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, offsets: off }
  }, [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const isRecording = phase === 'recording'
    const speedMult = isRecording ? 1.5 : 0.3

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const angle = offsets[i] + t * 0.2
      const r = 0.3 + Math.sin(t * 0.5 + offsets[i]) * 0.5
      // Particles rise upward and loop
      const yProgress = ((t * speeds[i] * speedMult + offsets[i]) % 3.0)
      arr[i * 3] = Math.cos(angle) * (r + yProgress * 0.3)
      arr[i * 3 + 1] = yProgress - 0.5
      arr[i * 3 + 2] = Math.sin(angle) * (r + yProgress * 0.3)
    }
    posAttr.needsUpdate = true

    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.color.copy(currentColor.current)
    mat.opacity = isRecording ? 0.7 : 0.35
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
        size={0.02}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
        opacity={0.5}
      />
    </points>
  )
}

// ── Glow Layers (bloom effect around mic) ─────────────────────
function GlowLayers({ phase }: { phase: Phase }) {
  const layer1Ref = useRef<THREE.Mesh>(null!)
  const layer2Ref = useRef<THREE.Mesh>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const pulseSpeed = phase === 'recording' ? 3.0 : 1.0
    const pulseAmp = phase === 'recording' ? 0.12 : 0.04

    const s1 = 1.8 + Math.sin(t * pulseSpeed) * pulseAmp
    layer1Ref.current.scale.setScalar(s1)
    const m1 = layer1Ref.current.material as THREE.MeshBasicMaterial
    m1.color.copy(currentColor.current)
    m1.opacity = 0.04 + Math.sin(t * pulseSpeed) * 0.02

    const s2 = 2.8 + Math.sin(t * pulseSpeed * 0.7 + 0.5) * pulseAmp * 1.3
    layer2Ref.current.scale.setScalar(s2)
    const m2 = layer2Ref.current.material as THREE.MeshBasicMaterial
    m2.color.copy(currentColor.current)
    m2.opacity = 0.02 + Math.sin(t * pulseSpeed * 0.7 + 0.5) * 0.01
  })

  return (
    <>
      <mesh ref={layer1Ref} position={[0, 0.2, 0]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent opacity={0.04} toneMapped={false} depthWrite={false}
        />
      </mesh>
      <mesh ref={layer2Ref} position={[0, 0.2, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent opacity={0.02} toneMapped={false} depthWrite={false}
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
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.1} />
        <MicrophoneBody phase={phase} />
        <MicStand phase={phase} />
        <SoundWaves phase={phase} />
        <WaveformBars phase={phase} />
        <AudioParticles phase={phase} />
        <GlowLayers phase={phase} />
      </Canvas>

      {/* Radial glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${c},${isRecording ? 0.12 : 0.07}) 0%, rgba(${c},0.02) 40%, transparent 70%)`,
          filter: 'blur(25px)',
        }}
      />

      {/* Pulsing ring border */}
      <div
        className="absolute inset-2 rounded-full pointer-events-none"
        style={{
          border: `1px solid rgba(${c},${isRecording ? 0.15 : 0.06})`,
          animation: isRecording
            ? 'voiceRecorderPulse 1.5s ease-in-out infinite'
            : 'voiceRecorderPulse 4s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes voiceRecorderPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.02); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
