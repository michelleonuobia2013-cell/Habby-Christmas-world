export type ProximityCueKind = 'clue' | 'hiding_spot';

export interface ProximitySource {
  id: string;
  kind: ProximityCueKind;
  x: number;
  y: number;
  z: number;
  radius?: number;
}

export interface ProximityAudioState {
  active: boolean;
  kind: ProximityCueKind | null;
  sourceId: string | null;
  distance: number;
  intensity: number; // 0..1 proximity strength
  pan: number; // -1 (left ear) .. +1 (right ear)
  clueIntensity: number;
  cluePan: number;
  hideIntensity: number;
  hidePan: number;
}

const DEFAULT_CLUE_RADIUS = 5.4;
const DEFAULT_HIDE_RADIUS = 4.6;

/**
 * Pure spatial calculation for dynamic binaural haunting cues near secret clues & hiding spots.
 * Uses the listener's horizontal right vector derived from cameraYaw so stereo panning rotates naturally
 * in both First-Person and Third-Person perspectives.
 */
export function evaluateProximityHaunting(params: {
  listenerPos: { x: number; y: number; z: number };
  cameraYaw: number;
  sources: ProximitySource[];
  isHiding?: boolean;
}): ProximityAudioState {
  const { listenerPos, cameraYaw, sources, isHiding } = params;

  // Forward in engine coordinates is (-sin(yaw), 0, -cos(yaw)); right is (+cos(yaw), 0, -sin(yaw))
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  let bestClueDist = Infinity;
  let bestClueIntensity = 0;
  let bestCluePan = 0;
  let bestClueId: string | null = null;

  let bestHideDist = Infinity;
  let bestHideIntensity = 0;
  let bestHidePan = 0;
  let bestHideId: string | null = null;

  for (const src of sources) {
    const dx = src.x - listenerPos.x;
    const dz = src.z - listenerPos.z;
    const dist = Math.hypot(dx, dz);
    const maxR = src.radius ?? (src.kind === 'clue' ? DEFAULT_CLUE_RADIUS : DEFAULT_HIDE_RADIUS);
    if (dist > maxR) continue;

    const norm = Math.max(0, Math.min(1, 1 - dist / maxR));
    const intensity = Number((norm * norm * 0.85 + norm * 0.15).toFixed(3));
    const invLen = dist > 1e-4 ? 1 / dist : 0;
    const rawPan = (dx * invLen) * rightX + (dz * invLen) * rightZ;
    const pan = Number(Math.max(-1, Math.min(1, rawPan)).toFixed(3));

    if (src.kind === 'clue' && intensity > bestClueIntensity) {
      bestClueIntensity = intensity;
      bestClueDist = dist;
      bestCluePan = pan;
      bestClueId = src.id;
    } else if (src.kind === 'hiding_spot' && !isHiding && intensity > bestHideIntensity) {
      bestHideIntensity = intensity;
      bestHideDist = dist;
      bestHidePan = pan;
      bestHideId = src.id;
    }
  }

  const pickClue = bestClueIntensity >= bestHideIntensity && bestClueIntensity > 0.04;
  const pickHide = !pickClue && bestHideIntensity > 0.04;

  if (pickClue) {
    return {
      active: true,
      kind: 'clue',
      sourceId: bestClueId,
      distance: Number(bestClueDist.toFixed(2)),
      intensity: bestClueIntensity,
      pan: bestCluePan,
      clueIntensity: bestClueIntensity,
      cluePan: bestCluePan,
      hideIntensity: bestHideIntensity,
      hidePan: bestHidePan,
    };
  }

  if (pickHide) {
    return {
      active: true,
      kind: 'hiding_spot',
      sourceId: bestHideId,
      distance: Number(bestHideDist.toFixed(2)),
      intensity: bestHideIntensity,
      pan: bestHidePan,
      clueIntensity: bestClueIntensity,
      cluePan: bestCluePan,
      hideIntensity: bestHideIntensity,
      hidePan: bestHidePan,
    };
  }

  return {
    active: false,
    kind: null,
    sourceId: null,
    distance: 99,
    intensity: 0,
    pan: 0,
    clueIntensity: 0,
    cluePan: 0,
    hideIntensity: 0,
    hidePan: 0,
  };
}
