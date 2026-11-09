import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Stats, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Project } from "../../content/projects";
import type { Language } from "../../i18n";
import { useSettings } from "../../lib/settings";

type Preset = "stone" | "timber" | "white";
type Light = "day" | "night";

const PRESETS: Record<Preset, { color: string; roughness: number }> = {
  stone: { color: "#d8cdb4", roughness: 0.9 },
  timber: { color: "#9a6b43", roughness: 0.7 },
  white: { color: "#f4f2ec", roughness: 1 },
};

/** Draco decoder is bundled locally (public/draco) so no script loads from a CDN. */
const DRACO_PATH = "/draco/";

function useMaterial(preset: Preset, clip: THREE.Plane) {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, clippingPlanes: [clip] }), [clip]);
  useEffect(() => {
    material.color.set(PRESETS[preset].color);
    material.roughness = PRESETS[preset].roughness;
  }, [material, preset]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/** Placeholder massing so the viewer can be reviewed before real GLB files arrive. Labelled illustrative in the UI. */
function IllustrativeMassing({ material }: { material: THREE.Material }) {
  const green = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6f8f6a", roughness: 1 }), []);
  useEffect(() => () => green.dispose(), [green]);
  return (
    <group>
      <mesh material={material} position={[0, 0.5, 0]} castShadow receiveShadow><boxGeometry args={[6, 1, 4]} /></mesh>
      <mesh material={material} position={[-1.3, 2.5, -0.4]} castShadow><boxGeometry args={[2.6, 3, 2.6]} /></mesh>
      <mesh material={material} position={[1.6, 2, 0.3]} castShadow><boxGeometry args={[2, 2, 3]} /></mesh>
      <mesh material={green} position={[1.6, 3.05, 0.3]}><boxGeometry args={[1.8, 0.1, 2.8]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#cfc6b3" /></mesh>
    </group>
  );
}

function GlbModel({ url, material }: { url: string; material: THREE.Material }) {
  const { scene } = useGLTF(url, DRACO_PATH);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = material; });
    return c;
  }, [scene, material]);
  useEffect(() => () => useGLTF.clear(url), [url]);
  return <primitive object={clone} />;
}

function Scene({ project, quality, preset, light, sectionY, controls }: {
  project: Project; quality: "low" | "high"; preset: Preset; light: Light; sectionY: number;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { gl } = useThree();
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 10), []);
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);
  useEffect(() => { clip.constant = sectionY; }, [clip, sectionY]);
  const material = useMaterial(preset, clip);
  const url = project.models[quality] ?? project.models.low;
  const day = light === "day";
  return (
    <>
      <color attach="background" args={[day ? "#f8f5eb" : "#10262a"]} />
      <hemisphereLight args={[day ? "#ffffff" : "#28465c", day ? "#b9ab8c" : "#0b1416", day ? 0.7 : 0.25]} />
      <directionalLight position={day ? [8, 12, 6] : [-6, 4, -8]} intensity={day ? 1.6 : 0.5} color={day ? "#fff4e0" : "#ffcf8a"} castShadow shadow-bias={-0.0005} shadow-normalBias={0.04} shadow-mapSize={[2048, 2048]} />
      {!day && <pointLight position={[0, 2.5, 2.5]} intensity={8} color="#ffcf8a" />}
      <Suspense fallback={null}>{url ? <GlbModel url={url} material={material} /> : <IllustrativeMassing material={material} />}</Suspense>
      <OrbitControls ref={controls} makeDefault enableDamping maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={40} />
      {import.meta.env.DEV && <Stats />}
    </>
  );
}

export default function ModelViewer({ project, quality }: { project: Project; quality: "low" | "high" }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { reducedMotion } = useSettings();
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [preset, setPreset] = useState<Preset>("stone");
  const [light, setLight] = useState<Light>("day");
  const [section, setSection] = useState(100);
  const sectionY = 0.2 + (section / 100) * 4.2;
  const description = project.modelDescription?.[lang] ?? t("projects.controls.description");

  const rotate = (deg: number) => {
    const c = controls.current; if (!c) return;
    c.setAzimuthalAngle(c.getAzimuthalAngle() + THREE.MathUtils.degToRad(deg)); c.update();
  };
  const zoom = (f: number) => {
    const c = controls.current; if (!c) return;
    const off = c.object.position.clone().sub(c.target).multiplyScalar(f);
    if (off.length() < c.minDistance || off.length() > c.maxDistance) return;
    c.object.position.copy(c.target).add(off); c.update();
  };
  const btn = "min-h-11 min-w-11 rounded-sm border border-line px-3 text-sm";

  return (
    <div>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-line">
        <Canvas
          role="img"
          aria-label={description}
          shadows={quality === "high"}
          dpr={quality === "high" ? [1, 2] : 1}
          frameloop={reducedMotion ? "demand" : "always"}
          camera={{ position: [9, 7, 11], fov: 40 }}
          gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
        >
          <Scene project={project} quality={quality} preset={preset} light={light} sectionY={sectionY} controls={controls} />
        </Canvas>
      </div>
      {!project.models.low && !project.models.high && <p className="mt-2 text-sm text-muted">{t("projects.controls.illustrative")}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("projects.viewer")}>
        <button type="button" className={btn} onClick={() => rotate(-15)} aria-label={t("projects.controls.rotateLeft")}>⟲</button>
        <button type="button" className={btn} onClick={() => rotate(15)} aria-label={t("projects.controls.rotateRight")}>⟳</button>
        <button type="button" className={btn} onClick={() => zoom(0.85)} aria-label={t("projects.controls.zoomIn")}>+</button>
        <button type="button" className={btn} onClick={() => zoom(1.15)} aria-label={t("projects.controls.zoomOut")}>−</button>
        <button type="button" className={btn} onClick={() => controls.current?.reset()}>{t("projects.controls.reset")}</button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm">
          {t("projects.controls.section")}
          <input type="range" min={0} max={100} value={section} onChange={(e) => setSection(Number(e.target.value))} className="min-h-11 accent-[var(--color-primary)]" />
        </label>
        <fieldset className="grid gap-2 text-sm">
          <legend className="mb-2">{t("projects.controls.material")}</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESETS) as Preset[]).map((p) => (
              <button key={p} type="button" aria-pressed={preset === p} onClick={() => setPreset(p)} className={`${btn} ${preset === p ? "bg-primary text-on-primary" : ""}`}>{t(`projects.controls.${p}`)}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2 text-sm">
          <legend className="mb-2">{t("projects.controls.light")}</legend>
          <div className="flex gap-2">
            {(["day", "night"] as Light[]).map((l) => (
              <button key={l} type="button" aria-pressed={light === l} onClick={() => setLight(l)} className={`${btn} ${light === l ? "bg-primary text-on-primary" : ""}`}>{t(`projects.controls.${l}`)}</button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
