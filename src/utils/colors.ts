export type HSLValues = [number, number, number];

export type HSLColor = [number, number, number];

export interface MountainColors {
    shadow: HSLColor;
    midtone: HSLColor;
    highlight: HSLColor;
}

export interface TimeColors {
  sky: {
      primary: HSLValues;
      secondary: HSLValues;
      accent: HSLValues;
  };
  terrain: {
      mountains: {
          shadow: HSLValues;
          midtone: HSLValues;
          highlight: HSLValues;
      };
      water: {
          deep: HSLValues;
          shallow: HSLValues;
          reflection: HSLValues;
      };
      vegetation: {
          dark: HSLValues;
          light: HSLValues;
          accent: HSLValues;
      };
  };
}

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export const ColorSystem = {
  times: {
      dawn: {
          sky: {
              primary: [200, 30, 85] as HSLColor,    // Soft blue
              secondary: [280, 20, 75] as HSLColor,   // Gentle purple
              accent: [30, 60, 85] as HSLColor        // Warm highlight
          },
          terrain: {
              mountains: {
                  shadow: [240, 30, 20] as HSLColor,
                  midtone: [220, 25, 40] as HSLColor,
                  highlight: [200, 15, 75] as HSLColor
              },
              water: {
                  deep: [200, 40, 40] as HSLColor,
                  shallow: [190, 35, 65] as HSLColor,
                  reflection: [180, 20, 80] as HSLColor
              },
              vegetation: {
                  dark: [120, 40, 25] as HSLColor,
                  light: [100, 35, 45] as HSLColor,
                  accent: [350, 80, 60] as HSLColor   // Vibrant flowers
              }
          }
      },
      day: {
          sky: {
              primary: [190, 60, 75] as HSLColor,
              secondary: [210, 40, 85] as HSLColor,
              accent: [40, 70, 95] as HSLColor
          },
          terrain: {
              mountains: {
                  shadow: [220, 35, 30] as HSLColor,
                  midtone: [210, 30, 50] as HSLColor,
                  highlight: [200, 20, 80] as HSLColor
              },
              water: {
                  deep: [185, 45, 45] as HSLColor,
                  shallow: [180, 40, 70] as HSLColor,
                  reflection: [175, 25, 85] as HSLColor
              },
              vegetation: {
                  dark: [115, 45, 30] as HSLColor,
                  light: [95, 40, 50] as HSLColor,
                  accent: [355, 85, 65] as HSLColor
              }
          }
      },
      dusk: {
          sky: {
              primary: [260, 40, 60] as HSLColor,
              secondary: [280, 50, 40] as HSLColor,
              accent: [20, 80, 70] as HSLColor
          },
          terrain: {
              mountains: {
                  shadow: [250, 40, 15] as HSLColor,
                  midtone: [240, 35, 35] as HSLColor,
                  highlight: [220, 25, 65] as HSLColor
              },
              water: {
                  deep: [210, 50, 35] as HSLColor,
                  shallow: [200, 45, 60] as HSLColor,
                  reflection: [190, 30, 75] as HSLColor
              },
              vegetation: {
                  dark: [125, 35, 20] as HSLColor,
                  light: [105, 30, 40] as HSLColor,
                  accent: [345, 75, 55] as HSLColor
              }
          }
      },
      night: {
          sky: {
              primary: [230, 30, 15] as HSLColor,
              secondary: [220, 40, 10] as HSLColor,
              accent: [60, 30, 90] as HSLColor        // Moon
          },
          terrain: {
              mountains: {
                  shadow: [230, 30, 10] as HSLColor,
                  midtone: [220, 25, 20] as HSLColor,
                  highlight: [210, 20, 40] as HSLColor
              },
              water: {
                  deep: [220, 40, 15] as HSLColor,
                  shallow: [210, 35, 25] as HSLColor,
                  reflection: [200, 25, 45] as HSLColor
              },
              vegetation: {
                  dark: [130, 25, 15] as HSLColor,
                  light: [110, 20, 25] as HSLColor,
                  accent: [340, 60, 40] as HSLColor
              }
          }
      }
  } as Record<TimeOfDay, TimeColors>,
interpolateColors(time: number): TimeColors {
        // Convert time (0-1) to the appropriate time period and blend
        const periods: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];
        const periodLength = 1 / periods.length;
        const periodIndex = Math.floor(time / periodLength);
        const nextPeriodIndex = (periodIndex + 1) % periods.length;
        const t = (time % periodLength) / periodLength;

        const currentPeriod = periods[periodIndex];
        const nextPeriod = periods[nextPeriodIndex];

        return this.blendTimeColors(
            this.times[currentPeriod],
            this.times[nextPeriod],
            t
        );
    },

    blendTimeColors(color1: TimeColors, color2: TimeColors, t: number): TimeColors {
        const blend = (a: HSLValues, b: HSLValues): HSLValues => {
            return [
                this.lerpAngle(a[0], b[0], t),
                this.lerp(a[1], b[1], t),
                this.lerp(a[2], b[2], t)
            ];
        };

        return {
            sky: {
                primary: blend(color1.sky.primary, color2.sky.primary),
                secondary: blend(color1.sky.secondary, color2.sky.secondary),
                accent: blend(color1.sky.accent, color2.sky.accent)
            },
            terrain: {
                mountains: {
                    shadow: blend(color1.terrain.mountains.shadow, color2.terrain.mountains.shadow),
                    midtone: blend(color1.terrain.mountains.midtone, color2.terrain.mountains.midtone),
                    highlight: blend(color1.terrain.mountains.highlight, color2.terrain.mountains.highlight)
                },
                water: {
                    deep: blend(color1.terrain.water.deep, color2.terrain.water.deep),
                    shallow: blend(color1.terrain.water.shallow, color2.terrain.water.shallow),
                    reflection: blend(color1.terrain.water.reflection, color2.terrain.water.reflection)
                },
                vegetation: {
                    dark: blend(color1.terrain.vegetation.dark, color2.terrain.vegetation.dark),
                    light: blend(color1.terrain.vegetation.light, color2.terrain.vegetation.light),
                    accent: blend(color1.terrain.vegetation.accent, color2.terrain.vegetation.accent)
                }
            }
        };
    },

    lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    },

    lerpAngle(a: number, b: number, t: number): number {
        // Ensure shortest path for hue interpolation
        const diff = b - a;
        let delta = ((((diff + 180) % 360) - 180) + 360) % 360 - 180;
        return (a + delta * t + 360) % 360;
    }
};

export const ColorBridge = {
    fromColorSystem(color: HSLValues): { h: number; s: number; b: number } {
        return { h: color[0], s: color[1], b: color[2] };
    },
    fromHSB(color: { h: number; s: number; b: number }): HSLValues {
        return [color.h, color.s, color.b];
    },
    toHSLString(color: HSLValues, alpha: number = 1): string {
        return `hsla(${color[0]}, ${color[1]}%, ${color[2]}%, ${alpha})`;
    }
};