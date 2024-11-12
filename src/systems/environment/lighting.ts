import { ColorSystem, TimeColors } from "../../utils/colors";

interface LightingState {
  sky: {
    primary: number[];
    secondary: number[];
    accent: number[];
  };
  ambient: {
    intensity: number;
    color: number[];
  };
  terrain: {
    mountains: {
      shadow: number[];
      midtone: number[];
      highlight: number[];
    };
    water: {
      deep: number[];
      shallow: number[];
      reflection: number[];
    };
    vegetation: {
      dark: number[];
      light: number[];
      accent: number[];
    };
  };
}

export class LightingSystem {
  private time: number = 0;
  private currentColors: LightingState;

  constructor() {
    this.currentColors = this.convertTimeColorsToLightingState(ColorSystem.times.day);
    this.updateColors(0);
  }

  updateColors(time: number) {
    // Calculate time of day (0-1)
    const dayProgress = (Math.sin(time * 0.1) + 1) / 2;
    
    // Interpolate between time periods
    this.currentColors = this.interpolateTimeColors(dayProgress);
  }

  private interpolateTimeColors(progress: number): LightingState {
    // Find appropriate time period and interpolate
    const times = ColorSystem.times;
    let period1, period2, t;
    
    if (progress < 0.25) {
      period1 = times.night;
      period2 = times.dawn;
      t = progress / 0.25;
    } else if (progress < 0.5) {
      period1 = times.dawn;
      period2 = times.day;
      t = (progress - 0.25) / 0.25;
    } else if (progress < 0.75) {
      period1 = times.day;
      period2 = times.dusk;
      t = (progress - 0.5) / 0.25;
    } else {
      period1 = times.dusk;
      period2 = times.night;
      t = (progress - 0.75) / 0.25;
    }

    const state1 = this.convertTimeColorsToLightingState(period1);
    const state2 = this.convertTimeColorsToLightingState(period2);
    return this.interpolateStates(state1, state2, t);
  }

  private convertTimeColorsToLightingState(timeColors: TimeColors): LightingState {
    // Convert the new ColorSystem format to our LightingState format
    return {
      sky: {
        primary: [...timeColors.sky.primary],
        secondary: [...timeColors.sky.secondary],
        accent: [...timeColors.sky.accent]
      },
      ambient: {
        intensity: 1.0, // Default value, adjust as needed
        color: [...timeColors.sky.primary] // Use sky primary as ambient color
      },
      terrain: {
        mountains: {
          shadow: [...timeColors.terrain.mountains.shadow],
          midtone: [...timeColors.terrain.mountains.midtone],
          highlight: [...timeColors.terrain.mountains.highlight]
        },
        water: {
          deep: [...timeColors.terrain.water.deep],
          shallow: [...timeColors.terrain.water.shallow],
          reflection: [...timeColors.terrain.water.reflection]
        },
        vegetation: {
          dark: [...timeColors.terrain.vegetation.dark],
          light: [...timeColors.terrain.vegetation.light],
          accent: [...timeColors.terrain.vegetation.accent]
        }
      }
    };
  }

  private interpolateStates(state1: LightingState, state2: LightingState, t: number): LightingState {
    // Smooth interpolation using cubic easing
    const ease = (x: number) => x * x * (3 - 2 * x);
    t = ease(t);

    return {
      sky: {
        primary: this.interpolateArray(state1.sky.primary, state2.sky.primary, t),
        secondary: this.interpolateArray(state1.sky.secondary, state2.sky.secondary, t),
        accent: this.interpolateArray(state1.sky.accent, state2.sky.accent, t)
      },
      ambient: {
        intensity: state1.ambient.intensity + (state2.ambient.intensity - state1.ambient.intensity) * t,
        color: this.interpolateArray(state1.ambient.color, state2.ambient.color, t)
      },
      terrain: {
        mountains: {
          shadow: this.interpolateArray(state1.terrain.mountains.shadow, state2.terrain.mountains.shadow, t),
          midtone: this.interpolateArray(state1.terrain.mountains.midtone, state2.terrain.mountains.midtone, t),
          highlight: this.interpolateArray(state1.terrain.mountains.highlight, state2.terrain.mountains.highlight, t)
        },
        water: {
          deep: this.interpolateArray(state1.terrain.water.deep, state2.terrain.water.deep, t),
          shallow: this.interpolateArray(state1.terrain.water.shallow, state2.terrain.water.shallow, t),
          reflection: this.interpolateArray(state1.terrain.water.reflection, state2.terrain.water.reflection, t)
        },
        vegetation: {
          dark: this.interpolateArray(state1.terrain.vegetation.dark, state2.terrain.vegetation.dark, t),
          light: this.interpolateArray(state1.terrain.vegetation.light, state2.terrain.vegetation.light, t),
          accent: this.interpolateArray(state1.terrain.vegetation.accent, state2.terrain.vegetation.accent, t)
        }
      }
    };
  }

  private interpolateArray(arr1: number[], arr2: number[], t: number): number[] {
    return arr1.map((value, i) => Math.round(value + (arr2[i] - value) * t));
  }

  getCurrentLighting() {
    return this.currentColors;
  }
}