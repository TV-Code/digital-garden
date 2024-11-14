import { TreeStyle, PlantDefinition, PlantType } from '../../types/environment/vegetation';
import { HSLColor } from '../../utils/colors';
import { TreeStyleType } from '../../types/environment/vegetation';


export const TREE_STYLES: Record<TreeStyleType, TreeStyle> = {
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
            color: [0, 0, 95] as HSLColor, // Pure white
            width: 0.08, // Thicker trunk
            taper: 0.92,
            markings: {
                density: 2,
                roughness: 0.4,
                pattern: 'peeling',
                colorVariation: 0.1
            }
        },
        foliage: {
            colors: [
                [0, 85, 50] as HSLColor,   // Bright red
                [5, 80, 45] as HSLColor,   // Deep red
                [10, 75, 40] as HSLColor   // Dark red
            ],
            shape: 'layered',
            density: 1.2,
            size: 1.4,
            animation: {
                swayAmount: 0.2,
                swaySpeed: 0.6
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
} as const;

export const PLANT_TYPES: Record<PlantType, PlantDefinition> = {
    tree: {
        type: 'tree',
        size: {
            min: 100,  // Increased minimum size
            max: 150   // Increased maximum size
        },
        density: 0.08,  // Slightly increased density
        conditions: {
            minSlope: 0,
            maxSlope: 0.6,  // More tolerant of slopes
            minMoisture: 0.1,  // Less demanding of moisture
            preferredLight: 0.8
        }
    },
    bush: {
        type: 'bush',
        size: {
            min: 40,
            max: 70
        },
        density: 0.05,
        conditions: {
            minSlope: 0,
            maxSlope: 0.7,
            minMoisture: 0.2,
            preferredLight: 0.6
        }
    },
    flower: {
        type: 'flower',
        size: {
            min: 15,
            max: 30
        },
        density: 0.03,
        conditions: {
            minSlope: 0,
            maxSlope: 0.4,
            minMoisture: 0.3,
            preferredLight: 0.9
        }
    },
    grass: {
        type: 'grass',
        size: {
            min: 10,
            max: 25
        },
        density: 0.04,
        conditions: {
            minSlope: 0,
            maxSlope: 0.6,
            minMoisture: 0.1,
            preferredLight: 0.7
        }
    },
    fern: {
        type: 'fern',
        size: {
            min: 20,
            max: 40
        },
        density: 0.02,
        conditions: {
            minSlope: 0,
            maxSlope: 0.5,
            minMoisture: 0.4,
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