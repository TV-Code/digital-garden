import { createNoise2D } from 'simplex-noise';
import { ColorSystem } from '../../../utils/colors';
import { Vector2 } from '../../../types';
import { BranchingSystem } from './Trees/BranchingSystem';
import { TreeRenderers } from './Trees/TreeRenderers';
import { TREE_STYLES } from '../../../configs/environment/vegetationConfig';
import { Tree, Branch, FoliageCluster, TreeStyle, CurvePoint } from '../../../types/environment/vegetation';



export class VegetationSystem {
    private noise2D = createNoise2D();
    private branchingSystem: BranchingSystem;
    private trees: Tree[] = [];

    private readonly TREE_TYPES = ['WHITE_BIRCH', 'BUBBLE_PINE', 'SAVANNA_TREE'] as const;

    constructor(
        private width: number,
        private height: number,
        private waterLevel: number
    ) {
        this.branchingSystem = new BranchingSystem();
    }

    public plantTree(position: Vector2, styleKey: string = 'COASTAL_PINE'): void {
        const style = TREE_STYLES[styleKey];
        if (!style) return;

        const tree: Tree = {
            position,
            style,
            trunk: this.generateTrunk(position, style),
            growth: 0,
            age: 0
        };

        this.trees.push(tree);
    }

    public plantTreeAtPosition(position: Vector2): void {
        // Randomly select a tree type
        const treeType = this.TREE_TYPES[Math.floor(Math.random() * this.TREE_TYPES.length)];
        const style = TREE_STYLES[treeType];

        if (!style) return;

        // Add some natural position variation
        const noise = this.noise2D(position.x * 0.01, position.y * 0.01);
        const adjustedPosition = {
            x: position.x + noise * 20,
            y: position.y + noise * 10
        };

        const tree: Tree = {
            position: adjustedPosition,
            style,
            trunk: this.generateTrunk(adjustedPosition, style),
            growth: 0,
            age: 0
        };

        this.trees.push(tree);
    }


    private generateTrunk(position: Vector2, style: TreeStyle): Branch {
        const baseHeight = 120;
        const trunk: Branch = {
            points: this.branchingSystem.generateBranch(
                position,
                -Math.PI / 2, // Straight up
                baseHeight,
                style
            ),
            width: style.trunkStyle.baseWidth,
            growth: 0,
            children: [],
            foliage: []
        };

        // Add main branches
        this.generateBranches(trunk, style, 0);
        return trunk;
    }

    private generateBranches(
        parentBranch: Branch,
        style: TreeStyle,
        depth: number,
        maxDepth: number = 3
    ): void {
        if (depth >= maxDepth) {
            // Add foliage clusters at branch tips
            this.generateFoliageClusters(parentBranch, style);
            return;
        }

        const branchCount = Math.max(2, 4 - depth);
        const parentLength = this.getBranchLength(parentBranch.points);

        for (let i = 0; i < branchCount; i++) {
            const t = (i + 1) / (branchCount + 1);
            const branchPosition = this.interpolatePosition(parentBranch.points, t);
            
            const baseAngle = this.getBranchAngleAt(parentBranch.points, t);
            const sideAngle = ((i % 2) * 2 - 1) * Math.PI / 4;
            const finalAngle = baseAngle + sideAngle;

            const newBranch: Branch = {
                points: this.branchingSystem.generateBranch(
                    branchPosition,
                    finalAngle,
                    parentLength * style.trunkStyle.taper,
                    style
                ),
                width: parentBranch.width * style.trunkStyle.taper,
                growth: 0,
                children: [],
                foliage: []
            };

            this.generateBranches(newBranch, style, depth + 1, maxDepth);
            parentBranch.children.push(newBranch);
        }
    }

    private generateFoliageClusters(branch: Branch, style: TreeStyle): void {
        const clusterCount = Math.floor(style.foliageStyle.density * 3);
        const branchEnd = branch.points[branch.points.length - 1].position;

        for (let i = 0; i < clusterCount; i++) {
            const t = i / clusterCount;
            const angle = Math.PI * 2 * t;
            const radius = style.foliageStyle.size * 0.3;

            const cluster: FoliageCluster = {
                position: {
                    x: branchEnd.x + Math.cos(angle) * radius,
                    y: branchEnd.y + Math.sin(angle) * radius
                },
                size: style.foliageStyle.size * (0.8 + Math.random() * 0.4),
                growth: 0,
                angle: angle
            };

            branch.foliage.push(cluster);
        }
    }

    // Helper methods
    private getBranchLength(points: CurvePoint[]): number {
        if (points.length < 2) return 0;
        const first = points[0].position;
        const last = points[points.length - 1].position;
        return Math.hypot(last.x - first.x, last.y - first.y);
    }

    private interpolatePosition(points: CurvePoint[], t: number): Vector2 {
        if (points.length < 2) return points[0].position;
        const index = Math.floor(t * (points.length - 1));
        const next = Math.min(index + 1, points.length - 1);
        const segmentT = t * (points.length - 1) - index;

        const current = points[index].position;
        const nextPos = points[next].position;

        return {
            x: current.x + (nextPos.x - current.x) * segmentT,
            y: current.y + (nextPos.y - current.y) * segmentT
        };
    }

    private getBranchAngleAt(points: CurvePoint[], t: number): number {
        const pos = this.interpolatePosition(points, t);
        const nextPos = this.interpolatePosition(points, Math.min(t + 0.1, 1));
        return Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x);
    }

    public update(time: number, deltaTime: number): void {
        const growthRate = 0.0005;

        this.trees.forEach(tree => {
            tree.age += deltaTime;
            tree.growth = Math.min(1, tree.growth + deltaTime * growthRate);

            const updateBranch = (branch: Branch, parentGrowth: number) => {
                if (parentGrowth > 0.3) {
                    branch.growth = Math.min(1, branch.growth + deltaTime * growthRate);
                }

                branch.children.forEach(child => {
                    updateBranch(child, branch.growth);
                });

                // Update foliage only when branch is mostly grown
                if (branch.growth > 0.7) {
                    branch.foliage.forEach(cluster => {
                        cluster.growth = Math.min(1, cluster.growth + deltaTime * growthRate * 2);
                    });
                }
            };

            updateBranch(tree.trunk, 1);
        });
    }

    private updateFoliageCluster(cluster: FoliageCluster, time: number): void {
        if (!cluster.path || cluster.growth >= 1) {
            cluster.path = this.generateFoliagePath(cluster, time);
        }
    }

    private generateFoliagePath(cluster: FoliageCluster, time: number): Path2D {
        const path = new Path2D();
        const { type } = this.getFoliageStyleForCluster(cluster);

        switch (type) {
            case 'needles':
                return this.generateNeedlesPath(cluster, time);
            case 'leaves':
                return this.generateLeavesPath(cluster, time);
            case 'clustered':
                return this.generateClusteredPath(cluster, time);
            default:
                return path;
        }
    }

    private getFoliageStyleForCluster(cluster: FoliageCluster): TreeStyle['foliageStyle'] {
        // Find the tree this cluster belongs to
        const tree = this.trees.find(t => 
            this.isClusterPartOfTree(cluster, t)
        );
        return tree?.style.foliageStyle || TREE_STYLES.COASTAL_PINE.foliageStyle;
    }

    private isClusterPartOfTree(cluster: FoliageCluster, tree: Tree): boolean {
        const checkBranch = (branch: Branch): boolean => {
            if (branch.foliage.includes(cluster)) return true;
            return branch.children.some(child => checkBranch(child));
        };
        return checkBranch(tree.trunk);
    }

    private generateNeedlesPath(cluster: FoliageCluster, time: number): Path2D {
        const path = new Path2D();
        const needleCount = 12;
        const baseSize = cluster.size * 0.5;

        for (let i = 0; i < needleCount; i++) {
            const angle = (i / needleCount) * Math.PI * 2 + cluster.angle;
            const length = baseSize * (0.8 + Math.random() * 0.4);
            
            // Add some wind movement
            const windOffset = Math.sin(time * 0.001 + i) * 2;
            
            const start = {
                x: cluster.position.x + Math.cos(angle) * 2,
                y: cluster.position.y + Math.sin(angle) * 2
            };
            
            const end = {
                x: start.x + Math.cos(angle) * length + windOffset,
                y: start.y + Math.sin(angle) * length
            };

            path.moveTo(start.x, start.y);
            path.lineTo(end.x, end.y);
        }

        return path;
    }

    private generateLeavesPath(cluster: FoliageCluster, time: number): Path2D {
        const path = new Path2D();
        const leafCount = 8;
        const baseSize = cluster.size * 0.7;

        for (let i = 0; i < leafCount; i++) {
            const angle = (i / leafCount) * Math.PI * 2 + cluster.angle;
            const size = baseSize * (0.8 + Math.random() * 0.4);
            
            // Add gentle wave motion
            const waveOffset = Math.sin(time * 0.001 + i) * 3;
            const center = {
                x: cluster.position.x + waveOffset,
                y: cluster.position.y
            };

            this.drawLeafShape(path, center, angle, size);
        }

        return path;
    }

    private generateClusteredPath(cluster: FoliageCluster, time: number): Path2D {
        const path = new Path2D();
        const segmentCount = 16;
        const baseSize = cluster.size;

        // Create cloud-like shape
        let startAngle = Math.random() * Math.PI * 2;
        path.moveTo(
            cluster.position.x + Math.cos(startAngle) * baseSize * 0.5,
            cluster.position.y + Math.sin(startAngle) * baseSize * 0.5
        );

        for (let i = 1; i <= segmentCount; i++) {
            const angle = (i / segmentCount) * Math.PI * 2 + startAngle;
            const wobble = Math.sin(time * 0.001 + angle * 3) * 2;
            const radius = baseSize * (0.4 + Math.random() * 0.2) + wobble;

            path.lineTo(
                cluster.position.x + Math.cos(angle) * radius,
                cluster.position.y + Math.sin(angle) * radius
            );
        }

        path.closePath();
        return path;
    }
    private drawLeafShape(path: Path2D, center: Vector2, angle: number, size: number): void {
        // Create leaf shape with bezier curves
        const width = size * 0.3;
        const cp1Distance = size * 0.5;
        const cp2Distance = size * 0.8;

        const tip = {
            x: center.x + Math.cos(angle) * size,
            y: center.y + Math.sin(angle) * size
        };

        const cp1Left = {
            x: center.x + Math.cos(angle - Math.PI/4) * cp1Distance,
            y: center.y + Math.sin(angle - Math.PI/4) * cp1Distance
        };

        const cp1Right = {
            x: center.x + Math.cos(angle + Math.PI/4) * cp1Distance,
            y: center.y + Math.sin(angle + Math.PI/4) * cp1Distance
        };

        const cp2Left = {
            x: tip.x + Math.cos(angle - Math.PI/2) * cp2Distance * 0.3,
            y: tip.y + Math.sin(angle - Math.PI/2) * cp2Distance * 0.3
        };

        const cp2Right = {
            x: tip.x + Math.cos(angle + Math.PI/2) * cp2Distance * 0.3,
            y: tip.y + Math.sin(angle + Math.PI/2) * cp2Distance * 0.3
        };

        path.moveTo(center.x, center.y);
        path.bezierCurveTo(cp1Left.x, cp1Left.y, cp2Left.x, cp2Left.y, tip.x, tip.y);
        path.bezierCurveTo(cp2Right.x, cp2Right.y, cp1Right.x, cp1Right.y, center.x, center.y);
    }

    public draw(ctx: CanvasRenderingContext2D, time: number): void {
        this.trees.forEach(tree => {
            const drawBranch = (branch: Branch) => {
                if (branch.growth <= 0) return;

                // Draw trunk/branch based on tree type
                if (tree.style.trunkStyle.markings) {
                    TreeRenderers.drawBirchTrunk(
                        ctx,
                        branch.points.map(p => p.position),
                        tree.style.trunkStyle,
                        branch.width * branch.growth,
                        branch.growth
                    );
                } else {
                    this.branchingSystem.drawBranch(
                        ctx,
                        branch.points,
                        branch.width * branch.growth,
                        branch.growth
                    );
                }

                // Draw foliage based on tree type
                if (branch.growth > 0.7) {
                    branch.foliage.forEach(cluster => {
                        switch (tree.style.foliageStyle.type) {
                            case 'clustered':
                                TreeRenderers.drawBirchFoliage(
                                    ctx,
                                    cluster.position,
                                    cluster.size,
                                    tree.style.foliageStyle,
                                    cluster.growth,
                                    time
                                );
                                break;
                            case 'cloud':
                                TreeRenderers.drawBubblePineFoliage(
                                    ctx,
                                    cluster.position,
                                    cluster.size,
                                    tree.style.foliageStyle,
                                    cluster.growth,
                                    time
                                );
                                break;
                            case 'layered':
                                TreeRenderers.drawSavannaFoliage(
                                    ctx,
                                    cluster.position,
                                    cluster.size,
                                    tree.style.foliageStyle,
                                    cluster.growth,
                                    time
                                );
                                break;
                        }
                    });
                }

                // Draw children
                branch.children.forEach(child => {
                    if (branch.growth > 0.3) {
                        drawBranch(child);
                    }
                });
            };

            drawBranch(tree.trunk);
        });
    }

    private applyTreeStyle(ctx: CanvasRenderingContext2D, style: TreeStyle): void {
        // Set up trunk style
        const trunkGradient = ctx.createLinearGradient(0, 0, 0, -100);
        trunkGradient.addColorStop(0, ColorSystem.toHSLString(style.trunkStyle.color));
        trunkGradient.addColorStop(1, ColorSystem.toHSLString([
            style.trunkStyle.color[0],
            style.trunkStyle.color[1],
            style.trunkStyle.color[2] + 10
        ]));

        ctx.strokeStyle = trunkGradient;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    private drawBarkTexture(
        ctx: CanvasRenderingContext2D, 
        branch: Branch, 
        trunkStyle: TreeStyle['trunkStyle']
    ): void {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = `hsla(${trunkStyle.color[0]}, ${trunkStyle.color[1]}%, ${Math.max(0, trunkStyle.color[2] - 20)}%, 0.3)`;
        ctx.lineWidth = 1;

        // Generate bark texture based on noise
        const points = branch.points;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1].position;
            const curr = points[i].position;
            const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const perpAngle = angle + Math.PI/2;
            
            const length = Math.hypot(curr.x - prev.x, curr.y - prev.y);
            const segments = Math.floor(length / 5);

            for (let j = 0; j < segments; j++) {
                const t = j / segments;
                const x = prev.x + (curr.x - prev.x) * t;
                const y = prev.y + (curr.y - prev.y) * t;
                
                const noise = this.noise2D(x * 0.1, y * 0.1) * branch.width * trunkStyle.barkDetail;
                
                ctx.beginPath();
                ctx.moveTo(
                    x + Math.cos(perpAngle) * noise,
                    y + Math.sin(perpAngle) * noise
                );
                ctx.lineTo(
                    x - Math.cos(perpAngle) * noise,
                    y - Math.sin(perpAngle) * noise
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    private drawFoliage(
        ctx: CanvasRenderingContext2D, 
        clusters: FoliageCluster[], 
        style: TreeStyle['foliageStyle']
    ): void {
        ctx.save();
        
        // Create gradient for foliage
        const foliageGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, style.size);
        foliageGradient.addColorStop(0, ColorSystem.toHSLString(style.color));
        foliageGradient.addColorStop(1, ColorSystem.toHSLString([
            style.color[0],
            style.color[1],
            style.color[2] - 10
        ]));

        ctx.fillStyle = foliageGradient;
        ctx.strokeStyle = `hsla(${style.color[0]}, ${style.color[1]}%, ${Math.max(0, style.color[2] - 20)}%, 0.3)`;
        ctx.lineWidth = 0.5;

        clusters.forEach(cluster => {
            if (!cluster.path || cluster.growth <= 0) return;

            ctx.save();
            ctx.translate(cluster.position.x, cluster.position.y);
            ctx.scale(cluster.growth, cluster.growth);
            ctx.translate(-cluster.position.x, -cluster.position.y);

            ctx.fill(cluster.path);
            ctx.stroke(cluster.path);
            ctx.restore();
        });

        ctx.restore();
    }
}