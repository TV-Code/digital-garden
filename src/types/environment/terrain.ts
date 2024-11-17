import { Vector2 } from '../index';

export type TerrainFeatureType = 'mountain' | 'cliff' | 'plateau' | 'valley' | 'shoreline';
export type FeatureType = 'ridge' | 'outcrop' | 'slope' | 'depression' | 'ledge';

export interface TerrainLayer {
    points: Vector2[];
    elevation: number;
    type: TerrainFeatureType;
    features: TerrainFeature[];
    path: Path2D;
}

export interface TerrainFeature {
    type: FeatureType;
    points: Vector2[];
    position: Vector2;
    size: number;
    elevation: number;
    path: Path2D;
    detail: FeatureDetail;
}

export interface FeatureDetail {
    roughness: number;
    erosion: number;
    moisture: number;
    vegetation: number;
}

export interface TerrainSystemConfig {
    width: number;
    height: number;
    waterLevel: number;
    params?: Partial<typeof TERRAIN_PARAMS>;
}

export interface TerrainSystemOptions {
    resolution?: number;
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
    baseFrequency?: number;
    erosionStrength?: number;
    smoothingPasses?: number;
}