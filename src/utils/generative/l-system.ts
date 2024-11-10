interface LSystemRule {
    predecessor: string;
    successor: string;
    probability?: number;
  }
  
  interface LSystemConfig {
    axiom: string;
    rules: LSystemRule[];
    iterations: number;
    angle: number;
    lengthFactor?: number;
  }
  
  export class LSystem {
    private config: LSystemConfig;
    private currentState: string;
  
    constructor(config: LSystemConfig) {
      this.config = config;
      this.currentState = config.axiom;
    }
  
    generate(): string {
      let result = this.config.axiom;
  
      for (let i = 0; i < this.config.iterations; i++) {
        let nextGen = '';
        
        for (const char of result) {
          const applicableRules = this.config.rules.filter(
            rule => rule.predecessor === char
          );
  
          if (applicableRules.length > 0) {
            // Choose rule based on probability
            const rule = this.selectRule(applicableRules);
            nextGen += rule.successor;
          } else {
            nextGen += char;
          }
        }
        
        result = nextGen;
      }
  
      this.currentState = result;
      return result;
    }
  
    private selectRule(rules: LSystemRule[]): LSystemRule {
      if (rules.length === 1) return rules[0];
  
      const totalProb = rules.reduce(
        (sum, rule) => sum + (rule.probability || 1), 
        0
      );
      
      let random = Math.random() * totalProb;
      
      for (const rule of rules) {
        const prob = rule.probability || 1;
        if (random <= prob) return rule;
        random -= prob;
      }
  
      return rules[0];
    }
  
    // Get points for visualization
    getPoints(): Array<[number, number, number]> {
      const points: Array<[number, number, number]> = [];
      const stack: Array<{
        x: number;
        y: number;
        z: number;
        angle: number;
        length: number;
      }> = [];
  
      let current = {
        x: 0,
        y: 0,
        z: 0,
        angle: 0,
        length: this.config.lengthFactor || 1
      };
  
      for (const char of this.currentState) {
        switch (char) {
          case 'F': // Move forward and draw
            const nextX = current.x + Math.cos(current.angle) * current.length;
            const nextY = current.y + Math.sin(current.angle) * current.length;
            points.push([current.x, current.y, current.z]);
            points.push([nextX, nextY, current.z]);
            current.x = nextX;
            current.y = nextY;
            break;
  
          case '+': // Turn right
            current.angle += this.config.angle;
            break;
  
          case '-': // Turn left
            current.angle -= this.config.angle;
            break;
  
          case '[': // Push state
            stack.push({ ...current });
            break;
  
          case ']': // Pop state
            const prevState = stack.pop();
            if (prevState) current = prevState;
            break;
  
          case 'X': // Growth point (no drawing)
            break;
        }
      }
  
      return points;
    }
  }
  
  // Predefined plant configurations
  export const PLANT_CONFIGS = {
    simpleBush: {
      axiom: 'F',
      rules: [
        {
          predecessor: 'F',
          successor: 'FF+[+F-F-F]-[-F+F+F]',
          probability: 1
        }
      ],
      iterations: 3,
      angle: Math.PI / 8,
      lengthFactor: 0.5
    },
    
    flower: {
      axiom: 'X',
      rules: [
        {
          predecessor: 'X',
          successor: 'F[+X][-X]FX',
          probability: 0.7
        },
        {
          predecessor: 'X',
          successor: 'F[-X]FX',
          probability: 0.3
        },
        {
          predecessor: 'F',
          successor: 'FF'
        }
      ],
      iterations: 4,
      angle: Math.PI / 6,
      lengthFactor: 0.4
    }
  };