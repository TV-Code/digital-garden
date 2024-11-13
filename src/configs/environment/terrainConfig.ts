import { ColorSystem, HSLColor } from '../../utils/colors';
import { TerrainType } from '../../types/environment/terrain';

export const TerrainConfig = {
    colors: {
        mountain: {
            base: [220, 15, 35] as HSLColor,
            shadow: [220, 20, 25] as HSLColor,
            highlight: [220, 10, 45] as HSLColor
        },
        valley: {
            base: [150, 20, 45] as HSLColor,
            shadow: [150, 25, 35] as HSLColor,
            highlight: [150, 15, 55] as HSLColor
        },
        plateau: {
            base: [30, 25, 40] as HSLColor,
            shadow: [30, 30, 30] as HSLColor,
            highlight: [30, 20, 50] as HSLColor
        },
        coastal: {
            base: [45, 30, 50] as HSLColor,
            shadow: [45, 35, 40] as HSLColor,
            highlight: [45, 25, 60] as HSLColor
        },
        riverbank: {
            base: [140, 25, 45] as HSLColor,
            shadow: [140, 30, 35] as HSLColor,
            highlight: [140, 20, 55] as HSLColor
        }
    },
    
    features: {
        ridge: {
            color: [210, 15, 40] as HSLColor,
            shadowIntensity: 0.3,
            roughness: 0.7
        },
        valley: {
            color: [150, 20, 45] as HSLColor,
            shadowIntensity: 0.4,
            roughness: 0.5
        },
        plateau: {
            color: [35, 25, 50] as HSLColor,
            shadowIntensity: 0.2,
            roughness: 0.3
        },
        cliff: {
            color: [200, 15, 35] as HSLColor,
            shadowIntensity: 0.5,
            roughness: 0.8
        },
        slope: {
            color: [160, 20, 45] as HSLColor,
            shadowIntensity: 0.3,
            roughness: 0.4
        }
    },

    // Generation parameters for each terrain type
    parameters: {
        mountain: {
            height: 0.8,
            roughness: 0.7,
            erosionStrength: 0.6,
            vegetationDensity: 0.4
        },
        valley: {
            height: 0.4,
            roughness: 0.5,
            erosionStrength: 0.7,
            vegetationDensity: 0.8
        },
        plateau: {
            height: 0.6,
            roughness: 0.3,
            erosionStrength: 0.4,
            vegetationDensity: 0.6
        },
        coastal: {
            height: 0.2,
            roughness: 0.4,
            erosionStrength: 0.8,
            vegetationDensity: 0.7
        },
        riverbank: {
            height: 0.3,
            roughness: 0.6,
            erosionStrength: 0.9,
            vegetationDensity: 0.9
        }
    }
};