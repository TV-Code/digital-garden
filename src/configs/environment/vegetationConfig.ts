import { TreeStyle, PlantDefinition, PlantType, TreeStyleType, 
    FoliageShape, PlantStyle, SeasonalStyle } from '../../types/environment/vegetation';
import { HSLColor } from '../../utils/colors';

export const TREE_STYLES: Record<string, TreeStyle> = {
    WHITE_BIRCH: {
        branchingPattern: 'upright',
        growthShape: 'rounded',
        foliageStyle: {
            type: 'clustered',
            density: 1.4,
            size: 35,
            color: [15, 85, 65] as HSLColor, // Warm coral/orange
            layerCount: 4,
            detail: {
                bubbleSize: 12,
                variance: 0.3,
                overlap: 0.4
            }
        },
        trunkStyle: {
            color: [0, 0, 95] as HSLColor, // Almost white
            baseWidth: 14,
            taper: 0.75,
            barkDetail: 0.8,
            markings: {
                color: [0, 0, 20] as HSLColor, // Dark grey
                frequency: 0.4,
                size: 8,
                variance: 0.3
            }
        },
        animation: {
            swayAmount: 0.001,
            swaySpeed: 0.001,
            leafRustleAmount: 0.002,
            leafRustleSpeed: 0.001
        }
    },

    BUBBLE_PINE: {
        branchingPattern: 'upright',
        growthShape: 'conical',
        foliageStyle: {
            type: 'cloud',
            density: 1.6,
            size: 40,
            color: [175, 45, 35] as HSLColor, // Blue-green
            layerCount: 5,
            detail: {
                bubbleSize: 15,
                variance: 0.2,
                overlap: 0.5,
                layers: 3,
                roundness: 0.9
            }
        },
        trunkStyle: {
            color: [200, 15, 25] as HSLColor, // Dark blue-grey
            baseWidth: 10,
            taper: 0.8,
            barkDetail: 0.5,
            curvature: 0.2
        },
        animation: {
            swayAmount: 0.002,
            swaySpeed: 0.001,
            bubbleWobbleAmount: 0.001,
            bubbleWobbleSpeed: 0.0005
        }
    },

    SAVANNA_TREE: {
        branchingPattern: 'spreading',
        growthShape: 'umbrella',
        foliageStyle: {
            type: 'layered',
            density: 1.2,
            size: 45,
            color: [85, 40, 40] as HSLColor, // Warm green
            layerCount: 3,
            detail: {
                layerSpread: 0.7,
                canopyDepth: 0.4,
                edgeDetail: 0.6,
                gapFrequency: 0.3
            }
        },
        trunkStyle: {
            color: [30, 35, 30] as HSLColor, // Warm brown
            baseWidth: 10,
            taper: 0.7,
            barkDetail: 0.6,
            branchSpread: {
                angle: 0.6,
                variance: 0.3,
                distribution: 'weighted-top'
            }
        },
        animation: {
            swayAmount: 0.25,
            swaySpeed: 0.01,
            canopyWaveAmount: 0.01,
            canopyWaveSpeed: 0.01
        }
    }
};

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

export interface BranchSpread {
    angle: number;
    variance: number;
    distribution: 'even' | 'weighted-top' | 'weighted-bottom';
}

export interface BarkMarkings {
    color: HSLColor;
    frequency: number;
    size: number;
    variance: number;
}

export interface TreeAnimation {
    swayAmount: number;
    swaySpeed: number;
    leafRustleAmount?: number;
    leafRustleSpeed?: number;
    bubbleWobbleAmount?: number;
    bubbleWobbleSpeed?: number;
    canopyWaveAmount?: number;
    canopyWaveSpeed?: number;
}

export const PLANT_TYPES: Record<PlantType, PlantDefinition> = {
tree: {
   type: 'tree',
   size: {
       min: 120,
       max: 180
   },
   density: 0.06,
   conditions: {
       minSlope: 0,
       maxSlope: 0.7,
       minMoisture: 0.15,
       preferredLight: 0.8,
       maxDensity: 0.4,
       soilTypes: ['rocky', 'fertile']
   },
   variations: [
       {
           name: 'coastal_pine',
           style: TREE_STYLES.COASTAL_PINE,
           probability: 0.4,
           conditions: {
               minSlope: 0,
               maxSlope: 0.5,
               minMoisture: 0.3,
               preferredLight: 0.9
           }
       },
       {
           name: 'windswept',
           style: TREE_STYLES.WINDSWEPT_TREE,
           probability: 0.3,
           conditions: {
               minSlope: 0.2,
               maxSlope: 0.8,
               minMoisture: 0.2,
               preferredLight: 0.7
           }
       }
   ]
},
bush: {
   type: 'bush',
   size: {
       min: 45,
       max: 80
   },
   density: 0.08,
   conditions: {
       minSlope: 0,
       maxSlope: 0.6,
       minMoisture: 0.25,
       preferredLight: 0.7,
       soilTypes: ['fertile', 'sandy']
   },
   variations: [
       {
           name: 'flowering_bush',
           style: {
               foliage: {
                   colors: [
                       [145, 35, 30] as HSLColor,  // Deep green
                       [150, 30, 35] as HSLColor   // Mid green
                   ],
                   shape: 'rounded',
                   density: 1.4,
                   size: 1.0,
                   texture: 'detailed'
               },
               animation: {
                   swayAmount: 0.3,
                   swaySpeed: 0.5,
                   growth: 1.0,
                   phase: 0
               }
           },
           probability: 0.6
       }
   ]
},
flower: {
   type: 'flower',
   size: {
       min: 20,
       max: 35
   },
   density: 0.05,
   conditions: {
       minSlope: 0,
       maxSlope: 0.4,
       minMoisture: 0.3,
       preferredLight: 0.9,
       soilTypes: ['fertile', 'sandy']
   },
   variations: [
       {
           name: 'coastal_bloom',
           style: {
               foliage: {
                   colors: [
                       [355, 85, 65] as HSLColor,  // Bright red
                       [0, 80, 70] as HSLColor     // Light red
                   ],
                   shape: 'rounded',
                   density: 1.2,
                   size: 1.0,
                   texture: 'smooth'
               },
               animation: {
                   swayAmount: 0.4,
                   swaySpeed: 0.8,
                   growth: 1.0,
                   phase: 0
               }
           },
           probability: 0.7
       }
   ]
},
grass: {
   type: 'grass',
   size: {
       min: 25,
       max: 40
   },
   density: 0.15,
   conditions: {
       minSlope: 0,
       maxSlope: 0.5,
       minMoisture: 0.2,
       preferredLight: 0.8,
       soilTypes: ['fertile', 'sandy', 'rocky']
   },
   variations: [
       {
           name: 'coastal_grass',
           style: {
               foliage: {
                   colors: [
                       [140, 35, 35] as HSLColor,  // Deep green
                       [145, 30, 40] as HSLColor   // Mid green
                   ],
                   shape: 'vase',
                   density: 2.0,
                   size: 1.0,
                   texture: 'smooth'
               },
               animation: {
                   swayAmount: 0.5,
                   swaySpeed: 1.0,
                   growth: 1.0,
                   phase: 0
               }
           },
           probability: 0.8
       }
   ]
},
fern: {
   type: 'fern',
   size: {
       min: 30,
       max: 50
   },
   density: 0.06,
   conditions: {
       minSlope: 0,
       maxSlope: 0.6,
       minMoisture: 0.4,
       preferredLight: 0.4,
       soilTypes: ['fertile']
   },
   variations: [
       {
           name: 'coastal_fern',
           style: {
               foliage: {
                   colors: [
                       [135, 40, 30] as HSLColor,  // Deep green
                       [140, 35, 35] as HSLColor   // Mid green
                   ],
                   shape: 'spreading',
                   density: 1.5,
                   size: 1.0,
                   texture: 'complex'
               },
               animation: {
                   swayAmount: 0.3,
                   swaySpeed: 0.6,
                   growth: 1.0,
                   phase: 0
               }
           },
           probability: 0.6
       }
   ]
}
};

export const createSeasonalStyle = (baseStyle: PlantStyle): SeasonalStyle => ({
spring: {
   colors: baseStyle.foliage?.colors.map(color => [
       color[0],
       color[1] * 1.1,
       color[2] * 1.1
   ] as HSLColor) || [],
   density: (baseStyle.foliage?.density || 1) * 1.2,
   animation: baseStyle.animation || {
       swayAmount: 0.3,
       swaySpeed: 0.6,
       growth: 1.0,
       phase: 0
   }
},
summer: {
   colors: baseStyle.foliage?.colors || [],
   density: baseStyle.foliage?.density || 1,
   animation: baseStyle.animation || {
       swayAmount: 0.3,
       swaySpeed: 0.6,
       growth: 1.0,
       phase: 0
   }
},
autumn: {
   colors: baseStyle.foliage?.colors.map(color => [
       30 + Math.random() * 30,
       70 + Math.random() * 20,
       45 + Math.random() * 15
   ] as HSLColor) || [],
   density: (baseStyle.foliage?.density || 1) * 0.8,
   animation: {
       ...(baseStyle.animation || {
           swayAmount: 0.3,
           swaySpeed: 0.6,
           growth: 1.0,
           phase: 0
       }),
       swayAmount: (baseStyle.animation?.swayAmount || 0.3) * 1.2
   }
},
winter: {
   colors: baseStyle.foliage?.colors.map(color => [
       color[0],
       color[1] * 0.7,
       color[2] * 0.9
   ] as HSLColor) || [],
   density: (baseStyle.foliage?.density || 1) * 0.6,
   animation: {
       ...(baseStyle.animation || {
           swayAmount: 0.3,
           swaySpeed: 0.6,
           growth: 1.0,
           phase: 0
       }),
       swaySpeed: (baseStyle.animation?.swaySpeed || 0.6) * 0.8
   }
}
});