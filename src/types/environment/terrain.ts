export * from './terrain.types';
export * from './features.types';

import { HSLColor } from '../../utils/colors';

export interface Vector2 {
    x: number;
    y: number;
}

export type TerrainType = 'mountain' | 'valley' | 'plateau' | 'coastal' | 'riverbank';

export interface TerrainLayer {
    path: Path2D;
    points: Vector2[];
    elevation: number;
    type: TerrainType;
    features: TerrainFeature[];
    vegetationZones: VegetationZone[];
}

export interface TerrainFeature {
    path: Path2D;
    points: Vector2[];
    type: 'ridge' | 'valley' | 'plateau' | 'cliff' | 'slope';
    position: Vector2;
    size: number;
    elevation: number;
    rockFormations: RockFormation[];
    erosionPatterns: ErosionPattern[];
}

export interface RockFormation {
    path: Path2D;
    detail: {
        cracks: Path2D[];
        texture: Path2D;
        weathering: Path2D[];
    };
    color: HSLColor;
    position: Vector2;
    size: number;
    age: number;
}

export interface ErosionPattern {
    paths: Path2D[];
    depth: number;
    type: 'water' | 'wind' | 'geological';
    age: number;
    activity: number;
}

export interface VegetationZone {
    bounds: Path2D;
    position: Vector2;
    moisture: number;
    slope: number;
    soilType: 'rocky' | 'fertile' | 'sandy';
    vegetationDensity: number;
}

export interface TerrainParams {
    mountainHeight: number;
    valleyDepth: number;
    cliffSteepness: number;
    erosionStrength: number;
    vegetationDensity: number;
}

export interface TerrainSystemOptions {
    width: number;
    height: number;
    waterLevel: number;
    params?: Partial<TerrainParams>;
}