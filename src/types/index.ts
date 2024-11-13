export * from './terrain';
export * from './vegetation';
export * from './atmosphere';

export interface Vector2 {
    x: number;
    y: number;
}

export interface HSLColor {
    h: number;
    s: number;
    b: number;
}

export interface WindEffect {
    intensity: number;
    direction: number;
    turbulence: number;
    gustiness: number;
}

export interface LightingEffect {
    intensity: number;
    direction: Vector2;
    color: HSLColor;
    shadows: boolean;
}

export interface GrowthEffect {
    stage: number;
    health: number;
    seasonalFactor: number;
}

export interface BarkStyle {
    roughness: number;
    pattern: 'ridged' | 'peeling' | 'flowing' | 'smooth';
    colorVariation: number;
}

export interface TreeStyle {
    trunk: {
        color: HSLColor;
        width: number;
        taper: number;
        bend?: number;
        twist?: number;
        bark?: BarkStyle;
        markings?: HSLColor;
        markingDensity?: number;
    };
    foliage: {
        colors: HSLColor[];
        shape: string;
        density: number;
        size: number;
        animation: {
            swayAmount: number;
            swaySpeed: number;
        };
    };
}

export interface Zones {
    shoreline: {
        start: number;
        end: number;
    };
    vegetation: {
        denseGrowth: Vector2[];
        sparse: Vector2[];
        sheltered: Vector2[];
    };
}

export interface TerrainInfo {
    height: number;
    slope: number;
    moisture: number;
}

export interface VegetationClusterParams {
    position: Vector2;
    slope: number;
    moisture: number;
    terrainHeight: number;
}