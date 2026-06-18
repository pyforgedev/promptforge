export const COMPOSITION_STYLES = [
  'rule of thirds with subject left-anchored',
  'symmetrical centered composition',
  'leading lines drawing eye to subject',
  'negative space right side — copy-ready',
  'layered depth with foreground blur',
  'overhead flat lay bird\'s eye view',
  'dutch angle for dynamic tension',
  'frame within a frame compositional device',
  'extreme close-up macro detail',
  'wide establishing environmental shot',
  'diagonal dynamic composition',
  'spiral golden ratio framing',
] as const

export const LIGHTING_TYPES = [
  'warm golden hour backlit glow',
  'cool overcast diffused natural light',
  'dramatic rembrandt side lighting',
  'clean three-point studio softbox',
  'moody low-key single source spotlight',
  'high-key bright even commercial lighting',
  'neon accent mixed with ambient darkness',
  'harsh midday directional sunlight with shadows',
  'soft window light lifestyle feel',
  'colored gel creative studio lighting',
  'twilight blue hour ambient',
  'candle or firelight intimate warmth',
] as const

export const MOOD_DESCRIPTORS = [
  'energetic and dynamic — optimistic forward motion',
  'calm and serene — meditative stillness',
  'professional and authoritative — trustworthy',
  'warm and intimate — personal connection',
  'bold and editorial — high-fashion tension',
  'minimal and clean — Scandinavian restraint',
  'nostalgic and emotive — soft memory',
  'adventurous and expansive — freedom',
  'luxurious and aspirational — quiet wealth',
  'raw and authentic — documentary candor',
  'playful and lighthearted — approachable joy',
  'dramatic and cinematic — narrative weight',
] as const

export const TECHNICAL_STYLES = [
  'shallow depth of field — subject isolated with bokeh',
  'deep focus — every plane sharp',
  'long exposure motion blur — silky movement',
  'high-key overexposed editorial',
  'cinematic 2.39:1 widescreen aspect',
  'tilt-shift miniature effect',
  'medium format film emulation — rich grain',
  'hyperreal digital sharpness — no grain',
  'drone aerial perspective',
  'fisheye wide angle distortion',
  'anamorphic lens flare character',
  'macro photography extreme detail',
] as const

export const COLOR_PALETTES = [
  'warm neutrals — cream, taupe, terracotta',
  'cool grays and slate blues',
  'vibrant saturated primaries — high contrast',
  'muted desaturated — faded film',
  'earth tones — ochre, sienna, forest',
  'monochromatic blue tonality',
  'pastel soft — millennial pink and mint',
  'high contrast black and white',
  'jewel tones — emerald, sapphire, burgundy',
  'golden analog film warmth',
  'neon brights on dark background',
  'duotone two-color stylized',
] as const

export const ENVIRONMENTS = [
  'minimalist white studio infinite backdrop',
  'outdoor urban street with city texture',
  'lush green natural outdoor setting',
  'modern open-plan office environment',
  'cozy residential interior — lived-in warmth',
  'industrial warehouse raw concrete and steel',
  'luxury hotel lobby or suite',
  'outdoor café patio — European street',
  'forest path dappled natural light',
  'abstract blurred bokeh background',
  'beachfront coastal golden hour',
  'mountain landscape panoramic',
  'night city skyline — bokeh lights',
  'home kitchen — lifestyle cooking context',
  'medical or clinical clean environment',
] as const

export const PHOTOGRAPHIC_STYLES = [
  'commercial lifestyle photography',
  'editorial magazine photography',
  'documentary candid photography',
  'minimalist product photography',
  'fashion editorial photography',
  'architectural photography',
  'portrait photography — environmental',
  'aerial / drone photography',
  'macro detail photography',
  'reportage journalism photography',
  'fine art photography',
  'food and beverage photography',
] as const

export type CompositionStyle = typeof COMPOSITION_STYLES[number]
export type LightingType = typeof LIGHTING_TYPES[number]
export type MoodDescriptor = typeof MOOD_DESCRIPTORS[number]
export type TechnicalStyle = typeof TECHNICAL_STYLES[number]
export type ColorPalette = typeof COLOR_PALETTES[number]
export type Environment = typeof ENVIRONMENTS[number]
export type PhotographicStyle = typeof PHOTOGRAPHIC_STYLES[number]
