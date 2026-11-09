/**
 * 3D massing for the feasibility studio. Lazy-loaded with three.js.
 * Units are metres. Geometry and materials are shared and disposed on unmount.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import * as THREE from "three";
import type { MassingState } from "./massing";

function useShared() {
  const shared = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0); // origin at the base
    const cone = new THREE.ConeGeometry(1, 1, 8);
    cone.translate(0, 0.5, 0);
    const m = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
    return {
      box,
      cone,
      ground: m("#d9c9a3"),
      plot: m("#e6dbc0"),
      concrete: m("#b9b5ad"),
      fresh: m("#cfcac0", { transparent: true, opacity: 0.55 }),
      stone: m("#e8dcc4", { roughness: 0.9 }),
      glass: m("#2d4a50", { roughness: 0.25, metalness: 0.3 }),
      plant: m("#8a8f94"),
      green: m("#6f8f6a"),
      crane: m("#e0a52b", { roughness: 0.6 }),
      steel: m("#6b7785", { metalness: 0.5, roughness: 0.5 }),
      hoarding: m("#20494f"),
    };
  }, []);
  useEffect(() => () => {
    for (const v of Object.values(shared)) (v as { dispose?: () => void }).dispose?.();
  }, [shared]);
  return shared;
}

type Shared = ReturnType<typeof useShared>;

function Block({ s, mat, x = 0, y = 0, z = 0, w, h, d }: { s: Shared; mat: THREE.Material; x?: number; y?: number; z?: number; w: number; h: number; d: number }) {
  return <mesh geometry={s.box} material={mat} position={[x, y, z]} scale={[w, h, d]} castShadow receiveShadow />;
}

function Crane({ s, height, reach, animate }: { s: Shared; height: number; reach: number; animate: boolean }) {
  const jib = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (animate && jib.current) jib.current.rotation.y += dt * 0.25; });
  return (
    <group>
      <Block s={s} mat={s.steel} w={1.2} h={height} d={1.2} />
      <group ref={jib} position={[0, height, 0]}>
        <Block s={s} mat={s.crane} x={reach * 0.35} w={reach * 1.3} h={0.9} d={0.9} />
        <Block s={s} mat={s.concrete} x={-reach * 0.25} w={3} h={1.6} d={1.6} />
      </group>
    </group>
  );
}

function Building({ st, s, animate }: { st: MassingState; s: Shared; animate: boolean }) {
  const { footprintSide: f, floorHeight: h, floors, plotSide } = st;
  const full = Math.floor(st.framed + 1e-9);
  const partial = st.framed - full;
  const clad = Math.floor(st.clad + 1e-9);
  const colSize = Math.max(0.4, f * 0.025);
  const half = f / 2 - colSize / 2;
  const top = full * h;
  const building: ReactElement[] = [];

  for (let k = 0; k < full; k++) {
    const y = k * h;
    if (k < clad) {
      building.push(
        <group key={k}>
          <Block s={s} mat={s.stone} y={y} w={f} h={h} d={f} />
          {/* Glazing band, set slightly proud so it reads at distance */}
          <Block s={s} mat={s.glass} y={y + h * 0.3} w={f * 1.004} h={h * 0.5} d={f * 1.004} />
        </group>,
      );
    } else {
      building.push(
        <group key={k}>
          <Block s={s} mat={s.concrete} y={y} w={f} h={0.35} d={f} />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
            <Block key={`${a}${b}`} s={s} mat={s.concrete} x={a * half} z={b * half} y={y} w={colSize} h={h} d={colSize} />
          ))}
        </group>,
      );
    }
  }
  if (partial > 0.02) building.push(<Block key="partial" s={s} mat={s.fresh} y={top} w={f * partial} h={0.35} d={f} />);
  if (full === floors) building.push(<Block key="roof" s={s} mat={s.concrete} y={top} w={f} h={0.4} d={f} />);
  if (st.services > 0.3 && full === floors) building.push(<Block key="plant" s={s} mat={s.plant} y={top + 0.4} w={f * 0.35} h={2.2 * st.services} d={f * 0.25} />);

  const showHoarding = st.foundation > 0 && st.landscaped < 1;
  const trees = st.landscaped > 0 ? Math.round(8 * st.landscaped) : 0;
  const ring = (f / 2 + plotSide / 2) / 2;

  return (
    <group>
      <Block s={s} mat={s.plot} y={-0.05} w={plotSide} h={0.1} d={plotSide} />
      {st.foundation > 0 && <Block s={s} mat={s.concrete} y={-0.05} w={f * 1.04} h={Math.max(0.05, 0.6 * st.foundation)} d={f * 1.04} />}
      <group position={[0, 0.55 * Math.min(1, st.foundation), 0]}>{building}</group>
      {showHoarding && [0, 1, 2, 3].map((q) => (
        <Block key={q} s={s} mat={s.hoarding} x={q === 0 ? -plotSide / 2 : q === 1 ? plotSide / 2 : 0} z={q === 2 ? -plotSide / 2 : q === 3 ? plotSide / 2 : 0} w={q < 2 ? 0.15 : plotSide} h={2.2} d={q < 2 ? plotSide : 0.15} />
      ))}
      {Array.from({ length: trees }, (_, n) => {
        const a = (n / Math.max(1, trees)) * Math.PI * 2 + 0.4;
        const r = Math.min(ring, plotSide / 2 - 2);
        return <mesh key={n} geometry={s.cone} material={s.green} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} scale={[2.2, 6, 2.2]} castShadow />;
      })}
      {st.crane && (
        <group position={[f / 2 + 4, 0, -f / 2 - 4]}>
          <Crane s={s} height={Math.max(18, top + 12)} reach={Math.min(f * 0.6 + 6, 45)} animate={animate} />
        </group>
      )}
    </group>
  );
}

function Scene({ st, animate }: { st: MassingState; animate: boolean }) {
  const s = useShared();
  const span = Math.max(st.plotSide, st.floors * st.floorHeight);
  return (
    <>
      <color attach="background" args={["#f1ead8"]} />
      <hemisphereLight args={["#ffffff", "#b9ab8c", 0.75]} />
      <directionalLight position={[span, span * 1.6, span * 0.8]} intensity={1.5} color="#fff4e0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.05}>
        <orthographicCamera attach="shadow-camera" args={[-span * 1.2, span * 1.2, span * 1.2, -span * 1.2, 1, span * 6]} />
      </directionalLight>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow material={s.ground}>
        <planeGeometry args={[span * 12, span * 12]} />
      </mesh>
      <Building st={st} s={s} animate={animate} />
      <OrbitControls makeDefault enableDamping target={[0, Math.min(st.floors * st.floorHeight, span) * 0.3, 0]} maxPolarAngle={Math.PI / 2.1} minDistance={span * 0.6} maxDistance={span * 5} />
    </>
  );
}

export default function MassingScene({ st, label, animate }: { st: MassingState; label: string; animate: boolean }) {
  const span = Math.max(st.plotSide, st.floors * st.floorHeight);
  return (
    <div className="aspect-[16/10] w-full overflow-hidden rounded-md border border-line">
      <Canvas
        role="img"
        aria-label={label}
        shadows
        dpr={[1, 2]}
        frameloop={animate && st.crane ? "always" : "demand"}
        camera={{ position: [span * 1.05, span * 1.05, span * 1.25], fov: 38, near: 0.5, far: span * 30 }}
      >
        <Scene st={st} animate={animate} />
      </Canvas>
    </div>
  );
}
