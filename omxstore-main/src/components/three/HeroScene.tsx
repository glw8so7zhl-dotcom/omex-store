import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  RoundedBox,
  Sparkles,
} from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

/**
 * OMEX — cinematic hero scene (polished).
 *
 * Client-only + lazy + idle-deferred + desktop-gated (see HeroCanvas).
 * Budget: capped DPR, no shadow maps (soft ContactShadows only), low-poly,
 * ~180 particles, in-scene image-based lighting (no HDR download).
 */

/** Subtle, lerped camera drift for a slow, expensive parallax. */
function Rig() {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 6.6));
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const x = pointer.x * 0.6 + Math.sin(t * 0.16) * 0.32;
    const y = pointer.y * 0.4 + Math.cos(t * 0.2) * 0.2;
    target.current.set(x, y, 6.6);
    camera.position.lerp(target.current, 0.035);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/** Floating premium device with a gentle oscillating turn (no full spin). */
function Device() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.34) * 0.28;
    }
  });
  return (
    <Float speed={1.15} rotationIntensity={0.35} floatIntensity={1.0}>
      <group ref={ref} position={[-1.6, 0, 0]} rotation={[0.2, -0.5, 0.06]}>
        <RoundedBox args={[1.7, 3.3, 0.28]} radius={0.16} smoothness={6}>
          <meshPhysicalMaterial
            color="#0b1220"
            metalness={0.9}
            roughness={0.16}
            clearcoat={1}
            clearcoatRoughness={0.18}
            envMapIntensity={1.35}
          />
        </RoundedBox>
        {/* glowing screen */}
        <mesh position={[0, 0, 0.152]}>
          <planeGeometry args={[1.44, 3.02]} />
          <meshStandardMaterial
            color="#1d4ed8"
            emissive="#3b82f6"
            emissiveIntensity={0.85}
            roughness={0.32}
            metalness={0.1}
          />
        </mesh>
        {/* camera bump */}
        <mesh position={[0.45, 1.15, 0.16]}>
          <circleGeometry args={[0.12, 32]} />
          <meshStandardMaterial color="#05070d" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </Float>
  );
}

/** Accent gem floating opposite the device for depth balance. */
function Orb() {
  return (
    <Float speed={1.9} rotationIntensity={1} floatIntensity={1.5}>
      <mesh position={[1.9, 0.6, -0.5]}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial
          color="#7c3aed"
          metalness={0.55}
          roughness={0.14}
          emissive="#4c1d95"
          emissiveIntensity={0.4}
          envMapIntensity={1.2}
        />
      </mesh>
    </Float>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6.6], fov: 34 }}
    >
      {/* atmospheric depth */}
      <fog attach="fog" args={["#0a0a16", 7.5, 17]} />
      <ambientLight intensity={0.35} />
      {/* key */}
      <directionalLight position={[5, 6, 5]} intensity={1.4} />
      {/* violet rim / back light for separation + premium edge glow */}
      <directionalLight position={[-5, 2, -6]} intensity={2.2} color="#7c3aed" />

      <Device />
      <Orb />

      {/* soft grounding shadow (cheaper + softer than shadow maps) */}
      <ContactShadows
        position={[0, -1.9, 0]}
        opacity={0.45}
        scale={14}
        blur={2.8}
        far={4.5}
        color="#05060f"
      />

      {/* premium particles */}
      <Sparkles count={180} scale={[13, 8, 6]} size={2.1} speed={0.28} opacity={0.5} color="#8ab4ff" />

      {/* realistic image-based lighting, generated in-scene (no HDR download) */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.4} position={[3, 4, 4]} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-4, -1, -3]} scale={[5, 5, 1]} color="#3b82f6" />
        <Lightformer form="ring" intensity={1.2} position={[-2, 3, -4]} scale={3} color="#7c3aed" />
      </Environment>

      <Rig />
    </Canvas>
  );
}
