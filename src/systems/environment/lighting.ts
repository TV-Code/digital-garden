import { ColorSystem } from "../../utils/colors";

export class LightingSystem {
    private time: number = 0;
    private currentColors: any;
  
    constructor() {
      this.updateColors(0);
    }
  
    updateColors(time: number) {
      // Calculate time of day (0-1)
      const dayProgress = (Math.sin(time * 0.1) + 1) / 2;
      
      // Interpolate between time periods
      this.currentColors = this.interpolateTimeColors(dayProgress);
    }
  
    private interpolateTimeColors(progress: number) {
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
  
      return this.interpolateColors(period1, period2, t);
    }
  
    private interpolateColors(color1: any, color2: any, t: number) {
      // Smooth interpolation using cubic easing
      const ease = t => t * t * (3 - 2 * t);
      t = ease(t);
  
      return {
        sky: {
          primary: color1.sky.primary.map((c, i) => 
            Math.round(c + (color2.sky.primary[i] - c) * t)
          ),
          secondary: color1.sky.secondary.map((c, i) =>
            Math.round(c + (color2.sky.secondary[i] - c) * t)
          )
        },
        ambient: {
          intensity: color1.ambient.intensity + 
                    (color2.ambient.intensity - color1.ambient.intensity) * t,
          color: color1.ambient.color.map((c, i) =>
            Math.round(c + (color2.ambient.color[i] - c) * t)
          )
        }
      };
    }
  
    getCurrentLighting() {
      return this.currentColors;
    }
  }