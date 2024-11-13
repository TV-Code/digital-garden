import { TreeStyle, PlantDefinition, PlantType } from '../../types/environment/vegetation';
import { HSLColor } from '../../utils/colors';


export const TREE_STYLES: Record<string, TreeStyle> = {
    MAPLE: {
        trunk: {
            color: [25, 30, 30] as HSLColor,
            width: 0.06,
            taper: 0.85,
            twist: 0.2,
            bark: {
                roughness: 0.8,
                pattern: 'ridged',
                colorVariation: 0.2
            }
        },
        foliage: {
            colors: [
                [15, 80, 45] as HSLColor,  // Deep red
                [25, 85, 50] as HSLColor,  // Orange-red
                [35, 90, 55] as HSLColor   // Gold
            ],
            shape: 'layered',
            density: 1.2,
            size: 1.3,
            animation: {
                swayAmount: 0.35,
                swaySpeed: 0.7
            }
        }
    },
    WHITE_BIRCH: {
        trunk: {
            color: [40, 5, 95] as HSLColor,
            width: 0.045,
            taper: 0.92,
            markings: [0, 0, 15] as HSLColor,
            markingDensity: 1.5,
            bark: {
                roughness: 0.3,
                pattern: 'peeling',
                colorVariation: 0.1
            }
        },
        foliage: {
            colors: [
                [60, 70, 55] as HSLColor,  // Yellow-green
                [80, 65, 50] as HSLColor,  // Fresh green
                [90, 60, 45] as HSLColor   // Deep green
            ],
            shape: 'wispy',
            density: 0.9,
            size: 1.1,
            animation: {
                swayAmount: 0.4,
                swaySpeed: 0.9
            }
        }
    },
    WEEPING_WILLOW: {
        trunk: {
            color: [30, 25, 35] as HSLColor,
            width: 0.07,
            taper: 0.88,
            bend: 0.3,
            bark: {
                roughness: 0.6,
                pattern: 'flowing',
                colorVariation: 0.15
            }
        },
        foliage: {
            colors: [
                [65, 45, 40] as HSLColor,  // Sage green
                [70, 40, 45] as HSLColor,  // Soft green
                [75, 35, 50] as HSLColor   // Light green
            ],
            shape: 'cascading',
            density: 1.3,
            size: 1.5,
            animation: {
                swayAmount: 0.5,
                swaySpeed: 0.6
            }
        }
    },
    SAKURA: {
        trunk: {
            color: [15, 30, 35] as HSLColor,
            width: 0.055,
            taper: 0.9,
            twist: 0.25,
            bark: {
                roughness: 0.4,
                pattern: 'smooth',
                colorVariation: 0.1
            }
        },
        foliage: {
            colors: [
                [350, 85, 90] as HSLColor,  // Light pink
                [345, 80, 85] as HSLColor,  // Medium pink
                [355, 75, 95] as HSLColor   // White-pink
            ],
            shape: 'cloud',
            density: 1.1,
            size: 1.2,
            animation: {
                swayAmount: 0.3,
                swaySpeed: 0.8
            }
        }
    }
};

export const PLANT_TYPES: Record<PlantType, PlantDefinition> = {
    tree: {
        type: 'tree',
        size: {
            min: 80,
            max: 120
        },
        density: 0.3,
        conditions: {
            minSlope: 0,
            maxSlope: 0.4,
            minMoisture: 0.2,
            preferredLight: 0.8,
            soilTypes: ['fertile', 'clay']
        }
    },
    bush: {
        type: 'bush',
        size: {
            min: 30,
            max: 50
        },
        density: 0.5,
        conditions: {
            minSlope: 0,
            maxSlope: 0.6,
            minMoisture: 0.3,
            preferredLight: 0.6
        }
    },
    flower: {
        type: 'flower',
        size: {
            min: 10,
            max: 20
        },
        density: 0.7,
        conditions: {
            minSlope: 0,
            maxSlope: 0.3,
            minMoisture: 0.4,
            preferredLight: 0.9
        }
    },
    grass: {
        type: 'grass',
        size: {
            min: 5,
            max: 15
        },
        density: 0.8,
        conditions: {
            minSlope: 0,
            maxSlope: 0.5,
            minMoisture: 0.2,
            preferredLight: 0.7
        }
    },
    fern: {
        type: 'fern',
        size: {
            min: 15,
            max: 30
        },
        density: 0.4,
        conditions: {
            minSlope: 0,
            maxSlope: 0.4,
            minMoisture: 0.6,
            preferredLight: 0.3
        }
    }
};

export const VEGETATION_COLORS = {
    SEASONS: {
        spring: {
            primary: [120, 60, 40] as HSLColor,
            secondary: [105, 55, 35] as HSLColor,
            accent: [350, 80, 60] as HSLColor
        },
        summer: {
            primary: [120, 50, 35] as HSLColor,
            secondary: [115, 45, 30] as HSLColor,
            accent: [45, 70, 55] as HSLColor
        },
        autumn: {
            primary: [30, 70, 45] as HSLColor,
            secondary: [25, 65, 40] as HSLColor,
            accent: [15, 80, 50] as HSLColor
        },
        winter: {
            primary: [210, 20, 30] as HSLColor,
            secondary: [200, 15, 25] as HSLColor,
            accent: [190, 10, 40] as HSLColor
        }
    }
};