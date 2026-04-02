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

function phaseHex(phase: Phase): string {
  switch (phase) {
    case 'recording':    return 'rgba(212,83,106,'
    case 'transcribing': return 'rgba(91,164,201,'
    case 'analyzing':    return 'rgba(46,174,123,'
    case 'done':         return 'rgba(46,174,123,'
    case 'error':        return 'rgba(212,83,106,'
    default:             return 'rgba(212,175,55,'
  }
}

function phaseIntensity(phase: Phase): number {
  switch (phase) {
    case 'recording': return 4.0
    case 'transcribing': return 2.5
    case 'analyzing': return 3.0
    case 'done': return 4.5
    default: return 1.8
  }
}

// ── Multi-layer Core Star ─────────────────────────────────────
function StarCore({ phase }: { phase: Phase }) {
  const innerRef = useRef<THREE.Mesh>(null!)
  const middleRef = useRef<THREE.Mesh>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))
  const originalPositions = useRef<Float32Array | null>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Smooth color transition
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const pulseSpeed = phase === 'recording' ? 3.5 : phase === 'idle' ? 1.2 : 2.0
    const pulseAmp = phase === 'recording' ? 0.18 : 0.09

    // ── Inner core: distorted icosahedron ──
    const innerScale = 1 + Math.sin(t * pulseSpeed) * pulseAmp
    innerRef.current.scale.setScalar(innerScale)
    innerRef.current.rotation.y += 0.005
    innerRef.current.rotation.x = Math.sin(t * 0.4) * 0.15

    // Vertex distortion for organic pulsing
    const geo = innerRef.current.geometry as THREE.BufferGeometry
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    if (!originalPositions.current) {
      originalPositions.current = new Float32Array(posAttr.array.length)
      originalPositions.current.set(posAttr.array as Float32Array)
    }
    const orig = originalPositions.current
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < posAttr.count; i++) {
      const ox = orig[i * 3]
      const oy = orig[i * 3 + 1]
      const oz = orig[i * 3 + 2]
      const distort = 1 + Math.sin(t * 2.5 + ox * 4.0) * 0.06
        + Math.sin(t * 1.8 + oy * 3.0) * 0.05
        + Math.sin(t * 3.2 + oz * 5.0) * 0.04
      arr[i * 3] = ox * distort
      arr[i * 3 + 1] = oy * distort
      arr[i * 3 + 2] = oz * distort
    }
    posAttr.needsUpdate = true

    const innerMat = innerRef.current.material as THREE.MeshStandardMaterial
    innerMat.color.copy(currentColor.current)
    innerMat.emissive.copy(currentColor.current)
    innerMat.emissiveIntensity = 1.0 + Math.sin(t * pulseSpeed) * 0.5

    // ── Middle shell: wireframe dodecahedron ──
    middleRef.current.rotation.y -= 0.008
    middleRef.current.rotation.x += 0.003
    middleRef.current.rotation.z = Math.sin(t * 0.5) * 0.2
    const middleMat = middleRef.current.material as THREE.MeshBasicMaterial
    middleMat.color.copy(currentColor.current)
    middleMat.opacity = 0.12 + Math.sin(t * 1.5) * 0.05

    // ── Outer halo: pulsating sphere ──
    const haloScale = 1.0 + Math.sin(t * pulseSpeed * 0.6) * 0.1
    haloRef.current.scale.setScalar(haloScale)
    const haloMat = haloRef.current.material as THREE.MeshBasicMaterial
    haloMat.color.copy(currentColor.current)
    haloMat.opacity = 0.04 + Math.sin(t * pulseSpeed * 0.4) * 0.02

    // Point light
    lightRef.current.color.copy(currentColor.current)
    lightRef.current.intensity = phaseIntensity(phase) + Math.sin(t * pulseSpeed) * 1.2
  })

  return (
    <>
      {/* Inner core — bright distorted icosahedron */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.4, 5]} />
        <meshStandardMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          emissive={new THREE.Color(0.83, 0.69, 0.22)}
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.95}
          toneMapped={false}
        />
      </mesh>

      {/* Middle shell — wireframe dodecahedron */}
      <mesh ref={middleRef}>
        <dodecahedronGeometry args={[0.65, 0]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          wireframe
          transparent
          opacity={0.15}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Outer halo — large semi-transparent sphere */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent
          opacity={0.04}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Point light from center */}
      <pointLight
        ref={lightRef}
        intensity={2.5}
        distance={10}
        decay={2}
      />
    </>
  )
}

// ── Inner Ring Particles (torus distribution) ──────────────────
function InnerRingParticles({ phase, count = 400 }: { phase: Phase; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const { positions, speeds, angles, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const ang = new Float32Array(count)
    const siz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 2
      const tubeR = 0.15 + Math.random() * 0.2
      const R = 1.5
      pos[i * 3] = (R + tubeR * Math.cos(phi)) * Math.cos(theta)
      pos[i * 3 + 1] = tubeR * Math.sin(phi) * 0.4
      pos[i * 3 + 2] = (R + tubeR * Math.cos(phi)) * Math.sin(theta)
      spd[i] = 0.3 + Math.random() * 0.8
      ang[i] = theta
      // Mix in some larger sparkle particles
      siz[i] = Math.random() < 0.08 ? 0.04 + Math.random() * 0.03 : 0.012 + Math.random() * 0.01
    }
    return { positions: pos, speeds: spd, angles: ang, sizes: siz }
  }, [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const speedMult = phase === 'recording' ? 3.0 : phase === 'transcribing' || phase === 'analyzing' ? 1.8 : 0.8
    const spiralInward = phase === 'recording' ? -0.15 : phase === 'idle' ? 0.05 : 0.0

    const geo = pointsRef.current.geometry
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const speed = speeds[i] * speedMult
      const theta = angles[i] + t * speed
      const phi = t * speeds[i] * 0.5 + i * 0.3
      const tubeR = 0.15 + Math.sin(t * 0.5 + i) * 0.1
      const R = 1.5 + spiralInward * Math.sin(t * 2 + i * 0.01)
      arr[i * 3] = (R + tubeR * Math.cos(phi)) * Math.cos(theta)
      arr[i * 3 + 1] = tubeR * Math.sin(phi) * 0.4
      arr[i * 3 + 2] = (R + tubeR * Math.cos(phi)) * Math.sin(theta)
    }
    posAttr.needsUpdate = true

    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.color.copy(currentColor.current)
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
        size={0.018}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
        opacity={0.8}
      />
    </points>
  )
}

// ── Outer Cloud Particles (spherical distribution) ─────────────
function OuterCloudParticles({ phase, count = 800 }: { phase: Phase; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const { positions, speeds, radii } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const rad = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 1.5 + Math.random() * 2.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      spd[i] = 0.05 + Math.random() * 0.25
      rad[i] = r
    }
    return { positions: pos, speeds: spd, radii: rad }
  }, [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const speedMult = phase === 'recording' ? 1.8 : phase === 'transcribing' || phase === 'analyzing' ? 1.2 : 0.4
    const spiralInward = phase === 'recording' ? -0.3 : phase === 'idle' ? 0.1 : 0.0

    const geo = pointsRef.current.geometry
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const r = radii[i] + spiralInward * Math.sin(t * 1.5 + i * 0.005)
      const speed = speeds[i] * speedMult
      const angle = t * speed + i * 0.008
      const phi = Math.acos(2 * ((i / count + t * 0.015 * speeds[i]) % 1) - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(angle)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(angle)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    posAttr.needsUpdate = true

    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.color.copy(currentColor.current)
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
        size={0.012}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
        opacity={0.5}
      />
    </points>
  )
}

// ── Light Rays — 12 primary + 6 secondary ─────────────────────
function LightRays({ phase }: { phase: Phase }) {
  const primaryRef = useRef<THREE.Group>(null!)
  const secondaryRef = useRef<THREE.Group>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const primaryRays = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      length: 1.5 + Math.random() * 1.5,
      speed: 0.3 + Math.random() * 0.5,
      phaseOffset: Math.random() * Math.PI * 2,
    }))
  }, [])

  const secondaryRays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2 + Math.PI / 6,
      length: 0.8 + Math.random() * 0.7,
      speed: 0.2 + Math.random() * 0.3,
      phaseOffset: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const isRecording = phase === 'recording'
    const pulseSpeed = isRecording ? 3.5 : 1.5
    const lengthMult = isRecording ? 1.4 : 1.0

    primaryRef.current.rotation.z = t * 0.08

    primaryRef.current.children.forEach((child, i) => {
      const ray = primaryRays[i]
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.copy(currentColor.current)
      mat.opacity = 0.035 + Math.sin(t * pulseSpeed + ray.phaseOffset) * 0.025
      const scale = 1 + Math.sin(t * ray.speed + ray.phaseOffset) * 0.35
      mesh.scale.set(0.018, ray.length * scale * lengthMult, 1)
    })

    secondaryRef.current.rotation.z = -t * 0.05

    secondaryRef.current.children.forEach((child, i) => {
      const ray = secondaryRays[i]
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.copy(currentColor.current)
      mat.opacity = 0.025 + Math.sin(t * pulseSpeed * 0.7 + ray.phaseOffset) * 0.015
      const scale = 1 + Math.sin(t * ray.speed + ray.phaseOffset) * 0.3
      mesh.scale.set(0.04, ray.length * scale * lengthMult, 1)
    })
  })

  return (
    <>
      <group ref={primaryRef}>
        {primaryRays.map((ray, i) => (
          <mesh key={`p-${i}`} rotation={[0, 0, ray.angle]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={new THREE.Color(0.83, 0.69, 0.22)}
              transparent
              opacity={0.04}
              toneMapped={false}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <group ref={secondaryRef}>
        {secondaryRays.map((ray, i) => (
          <mesh key={`s-${i}`} rotation={[0, 0, ray.angle]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={new THREE.Color(0.83, 0.69, 0.22)}
              transparent
              opacity={0.025}
              toneMapped={false}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </>
  )
}

// ── Orbiting Rings (gyroscope effect) ──────────────────────────
function OrbitingRings({ phase }: { phase: Phase }) {
  const ring1Ref = useRef<THREE.Mesh>(null!)
  const ring2Ref = useRef<THREE.Mesh>(null!)
  const ring3Ref = useRef<THREE.Mesh>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    // Ring 1: tilted, medium speed
    ring1Ref.current.rotation.x = t * 0.4 + 0.3
    ring1Ref.current.rotation.y = t * 0.2
    ring1Ref.current.rotation.z = Math.sin(t * 0.3) * 0.5
    const mat1 = ring1Ref.current.material as THREE.MeshBasicMaterial
    mat1.color.copy(currentColor.current)
    mat1.opacity = 0.08 + Math.sin(t * 1.2) * 0.03

    // Ring 2: opposite tilt, slower
    ring2Ref.current.rotation.x = -t * 0.25 + 1.2
    ring2Ref.current.rotation.y = t * 0.35 + 0.8
    ring2Ref.current.rotation.z = Math.cos(t * 0.4) * 0.6
    const mat2 = ring2Ref.current.material as THREE.MeshBasicMaterial
    mat2.color.copy(currentColor.current)
    mat2.opacity = 0.06 + Math.sin(t * 0.9 + 1.0) * 0.03

    // Ring 3: fast, steep angle
    ring3Ref.current.rotation.x = t * 0.15 + 2.0
    ring3Ref.current.rotation.y = -t * 0.5
    ring3Ref.current.rotation.z = Math.sin(t * 0.6) * 0.4 + 1.0
    const mat3 = ring3Ref.current.material as THREE.MeshBasicMaterial
    mat3.color.copy(currentColor.current)
    mat3.opacity = 0.05 + Math.sin(t * 1.5 + 2.0) * 0.025
  })

  return (
    <>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.2, 0.008, 8, 80]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          wireframe
          transparent
          opacity={0.1}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.6, 0.006, 8, 100]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          wireframe
          transparent
          opacity={0.08}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[2.0, 0.005, 8, 120]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          wireframe
          transparent
          opacity={0.06}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

// ── Enhanced Glow System (concentric bloom layers) ─────────────
function GlowLayers({ phase }: { phase: Phase }) {
  const layer1Ref = useRef<THREE.Mesh>(null!)
  const layer2Ref = useRef<THREE.Mesh>(null!)
  const layer3Ref = useRef<THREE.Mesh>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const isRecording = phase === 'recording'
    const pulseSpeed = isRecording ? 3.0 : 1.0
    const pulseAmp = isRecording ? 0.15 : 0.05

    // Layer 1 — closest, brightest
    const s1 = 1.3 + Math.sin(t * pulseSpeed) * pulseAmp
    layer1Ref.current.scale.setScalar(s1)
    const m1 = layer1Ref.current.material as THREE.MeshBasicMaterial
    m1.color.copy(currentColor.current)
    m1.opacity = 0.06 + Math.sin(t * pulseSpeed) * 0.03

    // Layer 2 — medium
    const s2 = 1.8 + Math.sin(t * pulseSpeed * 0.8 + 0.5) * pulseAmp * 1.2
    layer2Ref.current.scale.setScalar(s2)
    const m2 = layer2Ref.current.material as THREE.MeshBasicMaterial
    m2.color.copy(currentColor.current)
    m2.opacity = 0.03 + Math.sin(t * pulseSpeed * 0.8 + 0.5) * 0.015

    // Layer 3 — outermost, faintest
    const s3 = 2.4 + Math.sin(t * pulseSpeed * 0.6 + 1.0) * pulseAmp * 1.5
    layer3Ref.current.scale.setScalar(s3)
    const m3 = layer3Ref.current.material as THREE.MeshBasicMaterial
    m3.color.copy(currentColor.current)
    m3.opacity = 0.015 + Math.sin(t * pulseSpeed * 0.6 + 1.0) * 0.008
  })

  return (
    <>
      <mesh ref={layer1Ref}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent
          opacity={0.06}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={layer2Ref}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent
          opacity={0.03}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={layer3Ref}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent
          opacity={0.015}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

// ── Mic Icon Background (improved with arc) ───────────────────
function MicBackground({ phase }: { phase: Phase }) {
  const groupRef = useRef<THREE.Group>(null!)
  const bodyRef = useRef<THREE.Mesh>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)

    const mat = bodyRef.current.material as THREE.MeshBasicMaterial
    mat.color.copy(currentColor.current)
    mat.opacity = 0.04 + Math.sin(t * 0.8) * 0.015

    groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.04

    // Update all child materials
    groupRef.current.children.forEach((child) => {
      if (child !== bodyRef.current && (child as THREE.Mesh).material) {
        const m = (child as THREE.Mesh | THREE.Line).material as THREE.MeshBasicMaterial | THREE.LineBasicMaterial
        if (m.color) m.color.copy(currentColor.current)
      }
    })
  })

  return (
    <group ref={groupRef} position={[0, 0, -0.5]}>
      {/* Mic body (capsule) */}
      <mesh ref={bodyRef} position={[0, 0.15, 0]}>
        <capsuleGeometry args={[0.22, 0.45, 8, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent
          opacity={0.04}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Mic stand (thin cylinder) */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.35, 8]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
          transparent
          opacity={0.035}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Mic base (flat disk) */}
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(0.83, 0.69, 0.22)}
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

// ── Mic Arc Stand (separate line component) ────────────────────
function MicArc({ phase }: { phase: Phase }) {
  const lineRef = useRef<THREE.Line>(null!)
  const targetColor = useRef(phaseColor(phase))
  const currentColor = useRef(new THREE.Color(0.83, 0.69, 0.22))

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segments = 24
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (Math.PI * i) / segments // PI to 2PI (bottom half)
      points.push(new THREE.Vector3(
        Math.cos(angle) * 0.18,
        Math.sin(angle) * 0.18 - 0.3,
        0
      ))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [])

  useFrame(() => {
    targetColor.current = phaseColor(phase)
    currentColor.current.lerp(targetColor.current, 0.03)
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial
      mat.color.copy(currentColor.current)
    }
  })

  return (
    <primitive
      ref={lineRef}
      object={new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: new THREE.Color(0.83, 0.69, 0.22),
          transparent: true,
          opacity: 0.035,
        })
      )}
      position={[0, 0, -0.5]}
    />
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

  const glowColor = phaseHex(phase)
  const glowOpacity = phase === 'recording' ? 0.14 : phase === 'done' ? 0.12 : phase === 'transcribing' || phase === 'analyzing' ? 0.1 : 0.08

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
          toneMappingExposure: 1.4,
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.08} />
        <StarCore phase={phase} />
        <InnerRingParticles phase={phase} />
        <OuterCloudParticles phase={phase} />
        <LightRays phase={phase} />
        <OrbitingRings phase={phase} />
        <GlowLayers phase={phase} />
        <MicBackground phase={phase} />
        <MicArc phase={phase} />
      </Canvas>

      {/* Enhanced CSS glow underneath */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glowColor}${glowOpacity}) 0%, ${glowColor}${(glowOpacity * 0.5).toFixed(2)}) 35%, transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />

      {/* Animated ring around canvas */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: `1px solid ${glowColor}${phase === 'recording' ? 0.12 : 0.06})`,
          filter: 'blur(2px)',
          animation: phase === 'recording' ? 'starScenePulseRing 2s ease-in-out infinite' : 'starScenePulseRing 4s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes starScenePulseRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.03); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
