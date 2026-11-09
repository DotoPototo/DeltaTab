// Hue families ranked by saturation-weighted energy and objectness (compact central blob vs edge-touching
// wash), so a compact patch of 0.3% can beat a 99% grey wash. Skin-like material and grey never win.

import { compactnessOf, maxSpreadOf, addRarity, type Bucket, type Region } from '../measure';
import { clamp01, hueDiff, hueFamily, type HueFamily } from '../colour';
import type { Stage } from './types';

// [from, to) in degrees; wraps through 0° when from > to.
type HueBand = readonly [from: number, to: number];

const inBand = (hue: number, [from, to]: HueBand) => (from < to ? hue >= from && hue < to : hue >= from || hue < to);

const COOL_HUES: HueBand = [170, 265];
const WARM_HUES: HueBand = [320, 50];
// Warm plus yellow turns brown or black when dark; dark blue or green still reads as colour.
const DARKENS_TO_BROWN_HUES: HueBand = [320, 70];
const GREEN_BUCKET_HUES: HueBand = [70, 170];
const GREEN_FAMILY_HUES: HueBand = [70, 165];
const SKIN_HUES = { from: 14, to: 50 } as const;
const RED_WRAP_HUES: HueBand = [350, SKIN_HUES.from];
// Skips the skin oranges, where bright light is a highlight on skin, not a glow.
const GLOW_HUES: HueBand = [50, 8];
const VIOLET_SKY_HUES: HueBand = [235, 265];

const isCool = (hue: number) => inBand(hue, COOL_HUES);
const isWarm = (hue: number) => inBand(hue, WARM_HUES);

// The same order as the ladders.
const EYE_CATCH_PRIORITY: Record<HueFamily, number> = { red: 7, pink: 6, purple: 5, orange: 4, green: 3, yellow: 2, cyan: 1, blue: 1, grey: 0 };
const eyeCatchPriority = (hue: number) => EYE_CATCH_PRIORITY[hueFamily({ hue, sat: 1 })];

// Where colour reads as vivid rather than tinted (vmax values are HSV value, 0 to 255).
const VIVID_SAT = 0.45;
const VIVID_VMAX = 110;
const STRONG_SAT = 0.6;

// Vivid colour can be small, dull colour must dominate, and a lone standout in a grey scene still counts.
const VIVID_SHARE = 0.001;
const DULL_SHARE = 0.02;
const STANDOUT_ENERGY = 0.4;

// A vivid compact core marks a real object, not ambient colour.
const CORE = { sat: 0.9, compactness: 0.45, minShare: 0.005 };
const GLOW = { vmax: 215, minSat: 0.2 };

const VMAX_FLOOR = { darkensToBrown: 130, other: 70 };

const CANDIDATE = {
  minPixels: 3,
  colouredSat: 0.26,
  greenSatScale: 0.85,
  coolSatScale: 1.7,
};

// Skin: darker is shadow, lighter is highlight; a saturated red wash is coloured light; a vivid compact glow is an object.
const MATERIAL = {
  brightMin: 40,
  brightMax: 190,
  redWashSatMax: 0.75,
  washCompactnessMax: 0.35,
  washBorderMin: 0.2,
  objectSat: 0.65,
  objectCompactness: 0.88,
};

interface Scored {
  bk: Bucket;
  score: number;
}

const isWash = (bk: Bucket) => bk.compactness < MATERIAL.washCompactnessMax || bk.borderFrac > MATERIAL.washBorderMin;

// Any skin hue is material, but the red wrap holds true reds as well as dusky skin, so there only a dull wash is.
const isMaterial = (bk: Bucket) => {
  // Without the brightness bar, bright skin highlights would escape the material class and win as orange.
  const glowingObject = bk.sat >= MATERIAL.objectSat && bk.compactness >= MATERIAL.objectCompactness && bk.vmax >= GLOW.vmax;
  if (glowingObject || bk.bright < MATERIAL.brightMin || bk.bright > MATERIAL.brightMax) return false;
  if (bk.hue >= SKIN_HUES.from && bk.hue <= SKIN_HUES.to) return true;
  return inBand(bk.hue, RED_WRAP_HUES) && bk.sat <= MATERIAL.redWashSatMax && isWash(bk);
};

// Cools need more saturation: cold-tinted grey (slate, night haze) reads neutral.
const colouredSatFloor = (hue: number) => {
  let floor = CANDIDATE.colouredSat;
  if (inBand(hue, GREEN_BUCKET_HUES)) floor *= CANDIDATE.greenSatScale;
  else if (isCool(hue)) floor *= CANDIDATE.coolSatScale;
  return floor;
};

// Near-black fades in, near-white fades out unless saturated (coloured light), diffuse cools (sky, haze) recede.
const SCORE = {
  satExp: 2,
  rarityExp: 2.2,
  rarityOffset: 0.02,
  compactnessBonus: 1.2,
  borderPenalty: 0.6,
  centreBase: 0.4,
  centreGain: 0.6,
  darkFadeStart: 25,
  darkFadeEnd: 65,
  lightFadeStart: 215,
  lightFadeEnd: 250,
  lightFadeSatFrom: 0.2,
  lightFadeSatSpan: 0.4,
  coolDiffuseFactor: 0.4,
};

const smooth = (v: number, from: number, to: number) => clamp01((v - from) / (to - from));

const scoreBucket = (bk: Bucket, totalPixels: number) => {
  const mass = bk.freq / totalPixels;
  const satTerm = Math.pow(bk.sat, SCORE.satExp);
  const rarityTerm = Math.pow(bk.rarity + SCORE.rarityOffset, SCORE.rarityExp);
  const compactTerm = 1 + SCORE.compactnessBonus * bk.compactness;
  const borderTerm = 1 - SCORE.borderPenalty * bk.borderFrac;
  const centreTerm = SCORE.centreBase + SCORE.centreGain * bk.centreFrac;
  const darkFade = smooth(bk.vmax, SCORE.darkFadeStart, SCORE.darkFadeEnd);
  const rawLightFade = 1 - smooth(bk.bright, SCORE.lightFadeStart, SCORE.lightFadeEnd);
  const lightFade = rawLightFade + (1 - rawLightFade) * clamp01((bk.sat - SCORE.lightFadeSatFrom) / SCORE.lightFadeSatSpan);
  return mass * satTerm * rarityTerm * compactTerm * borderTerm * centreTerm * darkFade * lightFade;
};

const coolRecession = (bk: Bucket) => {
  if (!isCool(bk.hue)) return 1;
  const diffuse = Math.min(1, bk.borderFrac * 0.5 + (1 - bk.compactness) * 0.5);
  return 1 - (1 - SCORE.coolDiffuseFactor) * diffuse;
};

const collectCandidates = ({ buckets, totalPixels }: Region) => {
  const coloured: Scored[] = [];
  let materialPixels = 0;
  for (const bk of buckets) {
    if (bk.freq < CANDIDATE.minPixels || bk.sat < colouredSatFloor(bk.hue)) continue;
    if (isMaterial(bk)) {
      materialPixels += bk.freq;
      continue;
    }
    if (bk.vmax < (inBand(bk.hue, DARKENS_TO_BROWN_HUES) ? VMAX_FLOOR.darkensToBrown : VMAX_FLOOR.other)) continue;
    const score = scoreBucket(bk, totalPixels) * coolRecession(bk);
    if (score > 0) coloured.push({ bk, score });
  }
  return { coloured, skinShare: materialPixels / totalPixels };
};

const GROUPING = {
  hueBinWidth: 30,
  span: 45,
  maxFamilies: 5,
};

// Cool washes (room glow) and sky lose rank; a colour clearly bigger than its peers gains beyond raw energy.
const RANK = {
  coolWashFactor: 0.35,
  skyPenalty: 0.5,
  dominanceExp: 0.25,
  minEnergyShare: 0.01,
};

interface Family {
  buckets: Scored[];
  centroid: number;
  energy: number;
  energyShare: number;
  pixelShare: number;
  // Of the region's pixels.
  vividShare: number;
  coreShare: number;
  glowShare: number;
  saturatedShare: number;
  // Of the family's own pixels.
  vividFrac: number;
  peakSat: number;
  compactness: number;
  borderFrac: number;
  // 1 = tight central object, 0 = spread border-touching wash.
  objectness: number;
  rank: number;
}

const hueCentroid = (list: Scored[]) => {
  let sinSum = 0;
  let cosSum = 0;
  for (const sc of list) {
    const rad = (sc.bk.hue * Math.PI) / 180;
    sinSum += Math.sin(rad) * sc.score;
    cosSum += Math.cos(rad) * sc.score;
  }
  return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
};

// Geometry from raw moments: bucket compactness misleads for gradients, where a sky quantises into compact patches.
const measureFamily = (members: Scored[], { totalPixels, width, height }: Region, totalEnergy: number): Family => {
  let energy = 0;
  let pixels = 0;
  let vividPixels = 0;
  let corePixels = 0;
  let strongPixels = 0;
  let saturatedPixels = 0;
  let glowPixels = 0;
  const moments = { sumX: 0, sumY: 0, sumX2: 0, sumY2: 0 };
  let borderCount = 0;
  for (const { bk, score } of members) {
    energy += score;
    pixels += bk.freq;
    if (bk.sat >= VIVID_SAT && bk.vmax >= VIVID_VMAX) vividPixels += bk.freq;
    if (bk.sat >= CORE.sat && bk.compactness >= CORE.compactness) corePixels += bk.freq;
    if (bk.sat >= STRONG_SAT) strongPixels += bk.freq;
    if (bk.sat >= VIVID_SAT && bk.vmax >= VMAX_FLOOR.other) saturatedPixels += bk.freq;
    if (bk.vmax >= GLOW.vmax && bk.sat >= GLOW.minSat && inBand(bk.hue, GLOW_HUES)) glowPixels += bk.freq;
    moments.sumX += bk.sumX;
    moments.sumY += bk.sumY;
    moments.sumX2 += bk.sumX2;
    moments.sumY2 += bk.sumY2;
    borderCount += bk.borderCount;
  }
  const compactness = compactnessOf(moments, pixels, maxSpreadOf(width, height));
  const borderFrac = borderCount / pixels;
  const objectness = clamp01(compactness * 0.5 + (1 - borderFrac) * 0.5);
  const centroid = hueCentroid(members);
  const energyShare = totalEnergy > 0 ? energy / totalEnergy : 0;

  const washness = 1 - objectness;
  const coolWash = isCool(centroid) ? 1 - (1 - RANK.coolWashFactor) * washness : 1;
  // A cool wash whose mass sits in the top half of the frame is almost certainly sky.
  const topness = clamp01(1 - moments.sumY / pixels / (height * 0.5));
  const sky = isCool(centroid) ? 1 - RANK.skyPenalty * topness * washness : 1;
  const dominance = Math.pow(Math.max(energyShare, RANK.minEnergyShare), RANK.dominanceExp);
  const rank = energy * (1 + objectness) * coolWash * sky * dominance;

  return {
    buckets: members,
    centroid,
    energy,
    energyShare,
    pixelShare: pixels / totalPixels,
    vividShare: vividPixels / totalPixels,
    coreShare: corePixels / totalPixels,
    glowShare: glowPixels / totalPixels,
    saturatedShare: saturatedPixels / totalPixels,
    vividFrac: pixels > 0 ? strongPixels / pixels : 0,
    peakSat: Math.max(...members.map((sc) => sc.bk.sat)),
    compactness,
    borderFrac,
    objectness,
    rank,
  };
};

// Taking everything within span of the top bin's centroid lets a family straddle bin edges and 0°.
const groupIntoFamilies = (coloured: Scored[], region: Region): Family[] => {
  const totalEnergy = coloured.reduce((s, sc) => s + sc.score, 0);
  const binCount = Math.round(360 / GROUPING.hueBinWidth);
  const families: Family[] = [];
  let remaining = coloured;
  while (remaining.length > 0 && families.length < GROUPING.maxFamilies) {
    const binEnergy = new Array<number>(binCount).fill(0);
    const binBuckets: Scored[][] = Array.from({ length: binCount }, () => []);
    for (const sc of remaining) {
      const bin = Math.min(Math.floor(sc.bk.hue / GROUPING.hueBinWidth), binCount - 1);
      binEnergy[bin]! += sc.score;
      binBuckets[bin]!.push(sc);
    }
    let topBin = 0;
    for (let i = 1; i < binCount; i++) if (binEnergy[i]! > binEnergy[topBin]!) topBin = i;
    if (binEnergy[topBin]! <= 0) break;

    // Every bucket in the top bin lies within its width of the centroid, so the family is never empty.
    const centroid = hueCentroid(binBuckets[topBin]!);
    const members = remaining.filter((sc) => hueDiff(sc.bk.hue, centroid) <= GROUPING.span);
    remaining = remaining.filter((sc) => hueDiff(sc.bk.hue, centroid) > GROUPING.span);
    families.push(measureFamily(members, region, totalEnergy));
  }
  return families.sort((a, b) => b.rank - a.rank);
};

interface Scene {
  families: Family[];
  skinShare: number;
  leaderDemoted: boolean;
  // Skips the area and saturation gates.
  coherentPromotion: Family | null;
}

const hasCore = (f: Family) => f.coreShare >= CORE.minShare;
const isSignificant = (f: Family) => f.peakSat >= VIVID_SAT && (f.vividShare >= VIVID_SHARE || f.pixelShare >= DULL_SHARE);

const promoteFirst = (scene: Scene, qualifies: (f: Family) => boolean): Family | null => {
  const index = scene.families.findIndex((f, i) => i > 0 && qualifies(f));
  return index > 0 ? promote(scene, index) : null;
};

const promote = (scene: Scene, index: number): Family => {
  const [challenger] = scene.families.splice(index, 1);
  scene.families.unshift(challenger!);
  scene.leaderDemoted = true;
  return challenger!;
};

const DULL_WARM = { skinShare: 0.2, vividFrac: 0.08, altEnergyShare: 0.08, altPixelShare: 0.03, altObjectness: 0.55 };

// In a skin-heavy image, a warm leader with almost no strong colour is skin or its shadow.
const demoteDullWarmLeader = (scene: Scene) => {
  const [lead] = scene.families;
  if (!lead || !isWarm(lead.centroid) || scene.skinShare < DULL_WARM.skinShare || lead.vividFrac >= DULL_WARM.vividFrac) return;
  const isCoherentObject = (f: Family) => f.pixelShare >= DULL_WARM.altPixelShare && f.objectness >= DULL_WARM.altObjectness;
  const promoted = promoteFirst(scene, (f) => !isCool(f.centroid) && f.energyShare >= DULL_WARM.altEnergyShare && (isSignificant(f) || isCoherentObject(f)));
  if (promoted && isCoherentObject(promoted)) scene.coherentPromotion = promoted;
};

const COOL_AMBIENCE = { minObjectness: 0.5, altVividFrac: 0.25 };

// A coreless or washy cool leader is ambient light (sky, windows, a lit street) and wins only by default.
const demoteCoolAmbience = (scene: Scene) => {
  const [lead] = scene.families;
  if (!lead || !isCool(lead.centroid) || (hasCore(lead) && lead.objectness >= COOL_AMBIENCE.minObjectness)) return;
  promoteFirst(scene, (f) => !isCool(f.centroid) && isSignificant(f) && (!hasCore(lead) || f.vividFrac >= COOL_AMBIENCE.altVividFrac));
};

const SPECK_PIXEL_RATIO = 999;

// A coreless speck loses to a significant mass of colour around it.
const demoteSpeckBesideMass = (scene: Scene) => {
  const [lead] = scene.families;
  if (!lead || hasCore(lead) || lead.energyShare >= STANDOUT_ENERGY) return;
  promoteFirst(scene, (f) => !isCool(f.centroid) && f.pixelShare >= SPECK_PIXEL_RATIO * lead.pixelShare && isSignificant(f));
};

const WARM_GLOW = { vividFrac: 0.08, altEnergyRatio: 0.9, altPixelRatio: 2, altVividFrac: 0.5 };

// A pale warm halo in a strong violet sky is the light, not the subject.
const demoteWarmGlowBeforeVioletSky = (scene: Scene) => {
  const [lead] = scene.families;
  if (!lead || !isWarm(lead.centroid) || lead.vividFrac >= WARM_GLOW.vividFrac || hasCore(lead)) return;
  promoteFirst(
    scene,
    (f) =>
      inBand(f.centroid, VIOLET_SKY_HUES) &&
      f.energy >= WARM_GLOW.altEnergyRatio * lead.energy &&
      f.pixelShare >= WARM_GLOW.altPixelRatio * lead.pixelShare &&
      f.vividFrac >= WARM_GLOW.altVividFrac
  );
};

const SKIN_OVER_COOL_SHARE = 0.12;

// Skin ranks below bright blue but above dull blue.
const skinOutranksLeader = ({ families: [lead], skinShare }: Scene) => !!lead && isCool(lead.centroid) && !hasCore(lead) && skinShare >= SKIN_OVER_COOL_SHARE;

const TIE_BREAK = { rankRatio: 0.3, altObjectness: 0.55, altVividFrac: 0.4, altPixelShare: 0.01 };

// Between substantial vivid objects, the higher eye-catch priority wins (purple over orange).
const applyPriorityTieBreak = (scene: Scene) => {
  const { families } = scene;
  const [lead] = families;
  if (!lead) return;
  let bestIndex = -1;
  let bestPriority = eyeCatchPriority(lead.centroid);
  for (let i = 1; i < families.length; i++) {
    const f = families[i]!;
    if (f.rank < TIE_BREAK.rankRatio * lead.rank) continue;
    if (f.objectness < TIE_BREAK.altObjectness || f.vividFrac < TIE_BREAK.altVividFrac || f.pixelShare < TIE_BREAK.altPixelShare) continue;
    const priority = eyeCatchPriority(f.centroid);
    if (priority > bestPriority && isSignificant(f)) {
      bestPriority = priority;
      bestIndex = i;
    }
  }
  if (bestIndex > 0) promote(scene, bestIndex);
};

const CONFETTI = { minFamilies: 3, rankRatio: 1.15, maxEnergyShare: 0.5, demotedGateScale: 3 };

// No clear leader among several families: neutral is calmer than a coin flip, unless a rule promoted a strong one.
const isConfetti = ({ families, leaderDemoted, coherentPromotion }: Scene) => {
  if (families.length < CONFETTI.minFamilies) return false;
  const [top, second] = families as [Family, Family];
  const noClearLeader = top.rank / second.rank < CONFETTI.rankRatio && top.energyShare < CONFETTI.maxEnergyShare;
  if (!noClearLeader) return false;
  const significance = Math.max(top.vividShare / VIVID_SHARE, top.pixelShare / DULL_SHARE);
  return !(leaderDemoted && (significance >= CONFETTI.demotedGateScale || top === coherentPromotion));
};

const INCIDENTAL = {
  faceSkinShare: 0.5,
  faceMaxPixelShare: 0.02,
  edgeBorderFrac: 0.7,
  edgeMaxPixelShare: 0.02,
  edgeMaxCompactness: 0.7,
};

// Glints and lips in a portrait read as skin; coreless edge slivers are spill from outside the crop.
const isIncidental = (f: Family, { skinShare }: Scene) =>
  (isWarm(f.centroid) && f.pixelShare < INCIDENTAL.faceMaxPixelShare && skinShare >= INCIDENTAL.faceSkinShare) ||
  (f.borderFrac >= INCIDENTAL.edgeBorderFrac && f.pixelShare < INCIDENTAL.edgeMaxPixelShare && !hasCore(f) && f.compactness < INCIDENTAL.edgeMaxCompactness);

const GATES = {
  coolDullShare: 0.25,
  coolSaturatedShare: 0.01,
  coolPeakSatScale: 1.55,
  greenDiscountObjectness: 0.5,
};

// Cool is stricter: dull cool must dominate, vivid cool (dark navy counts) must hold area, and a slate wash never reads blue.
const passesGates = (f: Family, { coherentPromotion }: Scene) => {
  if (f === coherentPromotion) return true;
  const cool = isCool(f.centroid);
  const passesArea = cool
    ? f.saturatedShare >= GATES.coolSaturatedShare || f.pixelShare >= GATES.coolDullShare
    : f.vividShare >= VIVID_SHARE || f.pixelShare >= DULL_SHARE || f.energyShare >= STANDOUT_ENERGY;
  let satBar = VIVID_SAT;
  if (inBand(f.centroid, GREEN_FAMILY_HUES)) satBar = VIVID_SAT * CANDIDATE.greenSatScale;
  else if (cool) satBar = VIVID_SAT * GATES.coolPeakSatScale;
  const viaGreenDiscount = f.peakSat < VIVID_SAT;
  const passesSat = (f.peakSat >= satBar && (!viaGreenDiscount || f.objectness >= GATES.greenDiscountObjectness)) || f.glowShare >= VIVID_SHARE;
  return passesArea && passesSat;
};

const BLEND = {
  repSatExp: 0.75,
  maxShades: 3,
  decay: 0.75,
  hueTolerance: 8,
  satFloor: 0.6,
};

// Smooths quantisation noise, never mixes colours: only near-identical shades of the top pick take part.
const blendFamily = (members: Scored[]): string => {
  const weight = (sc: Scored) => sc.score * Math.pow(sc.bk.sat, BLEND.repSatExp);
  const ranked = members.slice().sort((a, b) => weight(b) - weight(a));
  const topPick = ranked[0]!;
  const shades = ranked
    .filter((sc) => hueDiff(sc.bk.hue, topPick.bk.hue) <= BLEND.hueTolerance && sc.bk.sat >= topPick.bk.sat * BLEND.satFloor)
    .slice(0, BLEND.maxShades);
  let [r, g, b, total] = [0, 0, 0, 0];
  shades.forEach((sc, i) => {
    const w = sc.score * Math.pow(BLEND.decay, i);
    r += sc.bk.r * w;
    g += sc.bk.g * w;
    b += sc.bk.b * w;
    total += w;
  });
  return `rgba(${Math.round(r / total)},${Math.round(g / total)},${Math.round(b / total)},1)`;
};

interface FamilyPick {
  colour: string;
  detail: string;
  objectness: number;
}

const selectFamily = (region: Region): FamilyPick | null => {
  if (region.totalPixels === 0) return null;
  const { coloured, skinShare } = collectCandidates(region);
  const scene: Scene = { families: groupIntoFamilies(coloured, region), skinShare, leaderDemoted: false, coherentPromotion: null };

  demoteDullWarmLeader(scene);
  demoteCoolAmbience(scene);
  demoteSpeckBesideMass(scene);
  demoteWarmGlowBeforeVioletSky(scene);
  // Judged on the leader before the tie-break, which only reorders vivid objects.
  const noColour = skinOutranksLeader(scene);
  applyPriorityTieBreak(scene);
  if (noColour || isConfetti(scene)) return null;

  const winner = scene.families.find((f) => !isIncidental(f, scene) && passesGates(f, scene));
  if (!winner) return null;
  return {
    colour: blendFamily(winner.buckets),
    detail: `family ~${Math.round(winner.centroid)}° (energy ${(winner.energyShare * 100).toFixed(0)}%, pixels ${(winner.pixelShare * 100).toFixed(1)}%, objectness ${winner.objectness.toFixed(2)})`,
    objectness: winner.objectness,
  };
};

export const familyStage: Stage = {
  name: 'family',
  run: ({ region, config }) => {
    const family = selectFamily(addRarity(region('familyCentre')));
    if (family) return { colour: family.colour, detail: family.detail };
    const wider = selectFamily(addRarity(region('centre')));
    if (wider && wider.objectness >= config.familyWiderObjectness) return { colour: wider.colour, detail: `wider centre: ${wider.detail}` };
    return null;
  },
};
