'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PointMaterial, Points } from '@react-three/drei'
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

function phaseIntensity(phase: Phase): number {
  switch (phase) {
    case 'recording': return 3.5
    case 'transcribing': return 2.0
    case 'analyzing': return 2.5
    case 'done': return 4.0
    default: return 1.5
  }
}

// ── Core Star Mesh ────────────────────────────────────────────
function StarCore({ phase }: { phase: Phase }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Smooth color transition
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    // Core pulsation
    const pulseSpeed = phase === 'recording' ? 3.0 : phase === 'idle' ? 1.2 : 2.0
    const pulseAmp = phase === 'recording' ? 0.15 : 0.08
    const scale = 1 + Math.sin(t * pulseSpeed) * pulseAmp
    meshRef.current.scale.setScalar(scale)

    // Core material
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.color.copy(currentColor.current)
    mat.emissive.copy(currentColor.current)
    mat.emissiveIntensity = 0.6 + Math.sin(t * pulseSpeed) * 0.3

    // Glow shell pulsation (slightly larger, offset phase)
    const glowScale = scale * 1.3 + Math.sin(t * pulseSpeed * 0.7) * 0.05
    glowRef.current.scale.setScalar(glowScale)
    const glowMat = glowRef.current.material as THREE.MeshBasicMaterial
    glowMat.color.copy(currentColor.current)
    glowMat.opacity = 0.08 + Math.sin(t * pulseSpeed) * 0.04

    // Point light
    lightRef.current.color.copy(currentColor.current)
    lightRef.current.intensity = phaseIntensity(phase) + Math.sin(t * pulseSpeed) * 0.8

    // Slow rotation
    meshRef.current.rotation.y += 0.003
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1
  })

  return (
    <>
      {/* Inner core — bright emissive sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.6, 4]} />
        <meshStandardMaterial
          color={currentColor.current}
          emissive={currentColor.current}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Glow shell — transparent larger sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshBasicMaterial
          color={currentColor.current}
          transparent
          opacity={0.1}
          toneMapped={false}
        />
      </mesh>

      {/* Point light from center */}
      <pointLight
        ref={lightRef}
        intensity={2}
        distance={8}
        decay={2}
      />
    </>
  )
}

// ── Orbiting Particles ─────────────────────────────────────────
function OrbitParticles({ phase, count = 600 }: { phase: Phase; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const { positions, speeds, radii } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const rad = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 1.0 + Math.random() * 2.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      spd[i] = 0.1 + Math.random() * 0.5
      rad[i] = r
    }
    return { positions: pos, speeds: spd, radii: rad }
  }, [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const speedMult = phase === 'recording' ? 2.5 : phase === 'transcribing' || phase === 'analyzing' ? 1.5 : 0.6
    const geo = pointsRef.current.geometry
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const r = radii[i]
      const speed = speeds[i] * speedMult
      const angle = t * speed + i * 0.01
      const phi = Math.acos(2 * ((i / count + t * 0.02 * speeds[i]) % 1) - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(angle)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(angle)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    posAttr.needsUpdate = true

    // Update color
    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.color.copy(currentColor.current)
  })

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={currentColor.current}
        size={0.015}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
        opacity={0.7}
      />
    </Points>
  )
}

// ── Light Rays ─────────────────────────────────────────────────
function LightRays({ phase }: { phase: Phase }) {
  const groupRef = useRef<THREE.Group>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const rays = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      length: 1.5 + Math.random() * 1.0,
      speed: 0.3 + Math.random() * 0.4,
    }))
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    groupRef.current.rotation.z = t * 0.1

    groupRef.current.children.forEach((child, i) => {
      const ray = rays[i]
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.copy(currentColor.current)

      const pulseSpeed = phase === 'recording' ? 3.0 : 1.5
      mat.opacity = 0.03 + Math.sin(t * pulseSpeed + ray.angle) * 0.025
      const scale = 1 + Math.sin(t * ray.speed + i) * 0.3
      mesh.scale.set(0.02, ray.length * scale, 1)
    })
  })

  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh key={i} rotation={[0, 0, ray.angle]} position={[0, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={currentColor.current}
            transparent
            opacity={0.04}
            toneMapped={false}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Mic Icon Background (subtle mesh) ──────────────────────────
function MicBackground({ phase }: { phase: Phase }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.color.copy(currentColor.current)
    mat.opacity = 0.03 + Math.sin(t * 0.8) * 0.015

    meshRef.current.rotation.z = Math.sin(t * 0.2) * 0.05
  })

  // Mic shape using a capsule + base arc
  return (
    <group position={[0, 0, -0.5]}>
      {/* Mic body (capsule) */}
      <mesh ref={meshRef} position={[0, 0.15, 0]}>
        <capsuleGeometry args={[0.25, 0.5, 8, 16]} />
        <meshBasicMaterial
          color={currentColor.current}
          transparent
          opacity={0.04}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Mic stand (thin cylinder) */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshBasicMaterial
          color={currentColor.current}
          transparent
          opacity={0.03}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Mic base (flat disk) */}
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 16]} />
        <meshBasicMaterial
          color={currentColor.current}
          transparent
          opacity={0.03}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ── Main Scene Export ──────────────────────────────────────────
export function StarScene({ phase, onClick, disabled }: StarSceneProps) {
  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ width: 280, height: 280 }}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.1} />
        <StarCore phase={phase} />
        <OrbitParticles phase={phase} />
        <LightRays phase={phase} />
        <MicBackground phase={phase} />
      </Canvas>

      {/* Subtle CSS glow underneath for depth */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: phase === 'recording'
            ? 'radial-gradient(circle, rgba(212,83,106,0.08) 0%, transparent 70%)'
            : phase === 'transcribing' || phase === 'analyzing'
            ? 'radial-gradient(circle, rgba(91,164,201,0.08) 0%, transparent 70%)'
            : phase === 'done'
            ? 'radial-gradient(circle, rgba(46,174,123,0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
    </div>
  )
}
