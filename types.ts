
export enum GrainTexture {
  UNIFORM = 'UNIFORM',
  GAUSSIAN = 'GAUSSIAN',
  SPECKLE = 'SPECKLE',
  FILM = 'FILM'
}

export interface GrainSettings {
  width: number;
  height: number;
  ppi: number;
  intensity: number; // 0 to 1
  scale: number; // 1 to 20 (grain size factor)
  roughness: number; // 0 to 1 (blur amount)
  opacity: number; // 0 to 1
  bgColor: string;
  grainColor: string;
  texture: GrainTexture;
  monochrome: boolean;
}

export interface AIRecipe {
  name: string;
  description: string;
  settings: Partial<GrainSettings>;
}

export const APP_LIMITS = {
  MAX_DIMENSION: 5000,
  MIN_DIMENSION: 1,
  MAX_PPI: 600,
  MAX_SCALE: 20,
  MAX_ROUGHNESS: 1,
  SAFE_PIXELS: 25000000, // 5000 * 5000
};
