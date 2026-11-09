export type DeviceTier = "none" | "low" | "high";

/**
 * Detect WebGL support and a rough GPU tier at startup.
 * none: no WebGL, show static views only. low: static renders with an "Explore in 3D" option.
 * high: full interaction. Refine with real-device profiling before launch.
 */
export function detectDeviceTier(doc: Document = document, nav: Navigator = navigator): DeviceTier {
  let gl: WebGLRenderingContext | null = null;
  let isWebGL2 = false;
  try {
    const canvas = doc.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    isWebGL2 = gl2 !== null;
    gl = (gl2 as unknown as WebGLRenderingContext | null) ?? canvas.getContext("webgl");
  } catch {
    return "none";
  }
  if (!gl) return "none";
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const mem = (nav as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return isWebGL2 && maxTex >= 4096 && mem >= 4 && cores >= 4 ? "high" : "low";
}
