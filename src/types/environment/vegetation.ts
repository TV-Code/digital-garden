import { HSLColor } from '../../utils/colors';
import { Vector2 } from '../index';

// Core Plant Types
export type PlantType = 'tree' | 'bush' | 'flower' | 'grass' | 'fern';
export type SoilType = 'rocky' | 'fertile' | 'sandy' | 'clay';
export type TreeStyleType = 
    | 'COASTAL_PINE' 
    | 'WINDSWEPT_TREE' 
    | 'CLIFF_TREE';

export interface CurvePoint {
    position: Vector2;
    control1?: Vector2;
    control2?: Vector2;
}

export interface TreeStyle {
    branchingPattern: 'upright' | 'weeping' | 'spreading';
    growthShape: 'conical' | 'rounded' | 'columnar' | 'umbrella';
    foliageStyle: {
        type: 'needles' | 'leaves' | 'clustered' | 'cloud' | 'layered';
        density: number;
        size: number;
        color: HSLColor;
        layerCount: number;
        detail?: {
            bubbleSize?: number;
            variance?: number;
            overlap?: number;
            layers?: number;
            roundness?: number;
            layerSpread?: number;
            canopyDepth?: number;
            edgeDetail?: number;
            gapFrequency?: number;
        };
    };
    trunkStyle: {
        color: HSLColor;
        baseWidth: number;
        taper: number;
        barkDetail: number;
        markings?: {
            color: HSLColor;
            frequency: number;
            size: number;
            variance: number;
        };
        branchSpread?: {
            angle: number;
            variance: number;
            distribution: 'even' | 'weighted-top' | 'weighted-bottom';
        };
        curvature?: number;
    };
    animation: {
        swayAmount: number;
        swaySpeed: number;
        leafRustleAmount?: number;
        leafRustleSpeed?: number;
        bubbleWobbleAmount?: number;
        bubbleWobbleSpeed?: number;
        canopyWaveAmount?: number;
        canopyWaveSpeed?: number;
    };
}

// Plant Growth and Conditions
export interface PlantDefinition {
    type: PlantType;
    size: {
        min: number;
        max: number;
    };
    density: number;
    conditions: PlantConditions;
    variations?: PlantVariation[];
}

export interface PlantConditions {
    minSlope: number;
    maxSlope: number;
    minMoisture: number;
    preferredLight: number;
    maxDensity?: number;
    soilTypes?: SoilType[];
}

// Plant Instance Types
export interface Plant {
    type: PlantType;
    position: Vector2;
    size: number;
    growth: number;
    variation: number;
    elements: PlantElements;
    colors: PlantColors;
    animation: PlantAnimation;
    style?: PlantStyle;
    health?: number;
    age?: number;
}

export interface PlantElements {
    trunk?: Path2D;
    foliage: Path2D[];
    details: Path2D[];
}

export interface PlantColors {
    primary: HSLColor;
    secondary: HSLColor;
    detail: HSLColor;
}

// Style and Animation
export interface PlantStyle {
    trunk?: TrunkStyle;
    foliage?: FoliageStyle;
    seasonal?: SeasonalStyle;
    animation?: AnimationStyle;
}

export interface TrunkStyle {
    color: HSLColor;
    width: number;
    taper: number;
    bend?: number;
    twist?: number;
    texture?: 'smooth' | 'rough' | 'bark' | 'striated';
}

export interface FoliageCluster {
    position: Vector2;
    size: number;
    growth: number;
    angle: number;
    path?: Path2D;
}

export interface Branch {
    points: CurvePoint[];
    width: number;
    growth: number;
    children: Branch[];
    foliage: FoliageCluster[];
}

export interface Tree {
    position: Vector2;
    style: TreeStyle;
    trunk: Branch;
    growth: number;
    age: number;
}

export type FoliageShape = 
    | 'rounded' 
    | 'conical' 
    | 'spreading' 
    | 'weeping' 
    | 'columnar'
    | 'vase'
    | 'irregular'
    | 'layered'
    | 'cloud';

export interface FoliageStyle {
    colors: HSLColor[];
    shape: FoliageShape;
    density: number;
    size: number;
    texture?: 'smooth' | 'detailed' | 'complex';
}

export interface FoliageCluster {
    position: Vector2;
    size: number;
    growth: number;
    angle: number;
    path?: Path2D;
}

export interface Branch {
    points: CurvePoint[];
    width: number;
    growth: number;
    children: Branch[];
    foliage: FoliageCluster[];
}

export interface Tree {
    position: Vector2;
    style: TreeStyle;
    trunk: Branch;
    growth: number;
    age: number;
}

// Animation and Seasonal Effects
export interface PlantAnimation {
    swayOffset: number;
    growthSpeed: number;
    phase: number;
    swayAmount?: number;
    swaySpeed?: number;
    windEffect?: WindEffect;
}

export interface AnimationStyle {
    swayAmount: number;
    swaySpeed: number;
    growth: number;
    phase: number;
}

export interface SeasonalStyle {
    spring: SeasonalVariation;
    summer: SeasonalVariation;
    autumn: SeasonalVariation;
    winter: SeasonalVariation;
}

export interface SeasonalVariation {
    colors: HSLColor[];
    density: number;
    animation: AnimationStyle;
}

// Vegetation Zones
export interface VegetationZone {
    bounds: Path2D;
    position: Vector2;
    moisture: number;
    slope: number;
    soilType: SoilType;
    vegetationDensity: number;
    conditions?: ZoneConditions;
}

export interface ZoneConditions {
    light: number;
    temperature: number;
    wind: number;
    elevation: number;
}

export interface VegetationCluster {
    position: Vector2;
    plants: Plant[];
    density: number;
    radius: number;
    type: PlantType;
}

export interface PlantVariation {
    name: string;
    style: PlantStyle;
    probability: number;
    conditions?: PlantConditions;
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
}

export interface GrowthEffect {
    stage: number;
    healthFactor: number;
    seasonalModifier: number;
}

export interface BarkStyle {
    roughness: number;
    pattern: 'ridged' | 'peeling' | 'flowing' | 'smooth';
    colorVariation: number;
    details?: {
        markings: boolean;
        texture: 'rough' | 'smooth' | 'flaky';
        depth: number;
    };
}

export interface FoliageDetail {
    bubbleSize?: number;
    variance?: number;
    overlap?: number;
    layers?: number;
    roundness?: number;
    layerSpread?: number;
    canopyDepth?: number;
    edgeDetail?: number;
    gapFrequency?: number;
}

export interface BranchingPattern {
    density: number;
    angle: number;
    distribution: 'regular' | 'random' | 'clustered';
    length: number;
}

export interface VegetationClusterParams {
    position: Vector2;
    slope: number;
    moisture: number;
    terrainHeight: number;
}