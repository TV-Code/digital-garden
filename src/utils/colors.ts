export const ColorSystem = {
  times: {
    dawn: {
      sky: { primary: [280, 65, 95], secondary: [35, 70, 90] },
      ambient: { intensity: 0.7, color: [35, 60, 95] }
    },
    day: {
      sky: { primary: [195, 80, 95], secondary: [185, 60, 85] },
      ambient: { intensity: 1.0, color: [195, 40, 100] }
    },
    dusk: {
      sky: { primary: [25, 80, 90], secondary: [280, 70, 85] },
      ambient: { intensity: 0.8, color: [25, 70, 95] }
    },
    night: {
      sky: { primary: [225, 70, 40], secondary: [220, 65, 35] },
      ambient: { intensity: 0.5, color: [220, 50, 60] }
    }
  },
  // Add water properties at the root level
  water: {
    surface: { h: 185, s: 65, b: 65 },
    deep: { h: 195, s: 70, b: 45 },
    foam: { h: 180, s: 20, b: 95 },
    reflection: { h: 185, s: 40, b: 80 },
    ripple: { h: 185, s: 30, b: 85 },
    highlight: { h: 185, s: 40, b: 80 }
  },
  landscape: {
    mountains: [
      { base: [225, 40, 40], highlight: [15, 30, 90], shadow: [235, 45, 25] },
      { base: [220, 45, 35], highlight: [15, 35, 85], shadow: [230, 50, 20] },
      { base: [215, 50, 30], highlight: [15, 40, 80], shadow: [225, 55, 15] }
    ],
    terrain: {
      rock: { light: [25, 30, 75], dark: [220, 25, 35] },
      soil: { light: [35, 40, 70], dark: [25, 45, 40] },
      sand: { light: [35, 30, 90], dark: [35, 35, 80] }
    }
  }
};

export const ColorBridge = {
  fromColorSystem(color: number[]): { h: number; s: number; b: number } {
    return { h: color[0], s: color[1], b: color[2] };
  },
  fromHSB(color: { h: number; s: number; b: number }): number[] {
    return [color.h, color.s, color.b];
  }
};