import { TreeStyle, PlantDefinition, PlantType, TreeStyleType, 
    FoliageShape, PlantStyle, SeasonalStyle } from '../../types/environment/vegetation';
import { HSLColor } from '../../utils/colors';

export const TREE_STYLES: Record<TreeStyleType, TreeStyle> = {
    COASTAL_PINE: {
        trunk: {
            color: [25, 20, 15] as HSLColor, // Darker, more muted trunk
            width: 0.035, // Thinner trunk
            taper: 0.95,  // More gradual taper
            bend: 0.15,   // Subtle bend
            texture: 'smooth', // Clean aesthetic
        },
        foliage: {
            colors: [
                [160, 25, 15] as HSLColor,  // Dark silhouette base
                [165, 20, 20] as HSLColor,  // Subtle midtone
                [170, 15, 25] as HSLColor   // Highlight for depth
            ],
            shape: 'rounded',    // Bubble-like shape
            density: 1.4,        // Dense foliage
            size: 1.3,          // Larger size
            texture: 'smooth'    // Clean edges
        },
        animation: {
            swayAmount: 0.15,    // Subtle movement
            swaySpeed: 0.4,      // Slower, more graceful
            growth: 1.0,
            phase: 0
        }
    },
    WINDSWEPT_TREE: {
        trunk: {
            color: [20, 25, 20] as HSLColor,
            width: 0.03,
            taper: 0.92,
            bend: 0.25,
            texture: 'smooth'
        },
        foliage: {
            colors: [
                [155, 20, 15] as HSLColor,  // Darker base
                [160, 15, 20] as HSLColor,  // Subtle variation
                [165, 10, 25] as HSLColor   // Minimal highlight
            ],
            shape: 'cloud',      // Organic cloud-like shape
            density: 1.5,        // Very dense
            size: 1.2,          // Good presence
            texture: 'smooth'
        },
        animation: {
            swayAmount: 0.2,
            swaySpeed: 0.5,
            growth: 1.0,
            phase: 0
        }
    },
    CLIFF_TREE: {
        trunk: {
            color: [15, 20, 15] as HSLColor,
            width: 0.025,
            taper: 0.96,
            bend: 0.2,
            texture: 'smooth'
        },
        foliage: {
            colors: [
                [150, 15, 10] as HSLColor,  // Very dark base
                [155, 10, 15] as HSLColor,  // Minimal variation
                [160, 5, 20] as HSLColor    // Subtle highlight
            ],
            shape: 'layered',    // Horizontal layering
            density: 1.6,        // Very dense
            size: 1.1,          // Balanced size
            texture: 'smooth'
        },
        animation: {
            swayAmount: 0.1,     // Minimal movement
            swaySpeed: 0.3,      // Slow and steady
            growth: 1.0,
            phase: 0
        }
    }
};

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