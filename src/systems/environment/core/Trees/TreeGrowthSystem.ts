import { createNoise2D } from 'simplex-noise';
import { Vector2 } from '../../../../types';
import { HSLColor, ColorSystem } from '../../../../utils/colors';

interface BranchNode {
    position: Vector2;
    angle: number;
    length: number;
    width: number;
    children: BranchNode[];
    growth: number;  // 0 to 1
    path?: Path2D;
}

interface TreeParams {
    maxDepth: number;
    branchAngleVariance: number;
    lengthReductionFactor: number;
    widthReductionFactor: number;
    maxBranchesPerNode: number;
}

export class TreeGrowthSystem {
    private noise2D = createNoise2D();
    
    // Style constraints
    private readonly STYLE_CONSTRAINTS = {
        minBranchAngle: Math.PI / 6,   // 30 degrees
        maxBranchAngle: Math.PI / 3,   // 60 degrees
        minLengthRatio: 0.6,
        maxLengthRatio: 0.85,
        minWidthRatio: 0.5,
        maxWidthRatio: 0.7
    };

    // Default tree parameters with aesthetic constraints
    private readonly DEFAULT_PARAMS: TreeParams = {
        maxDepth: 3,  // Limit depth for aesthetic control
        branchAngleVariance: 0.2,
        lengthReductionFactor: 0.75,
        widthReductionFactor: 0.6,
        maxBranchesPerNode: 3
    };

    generateTree(
        startPos: Vector2,
        initialAngle: number,
        initialLength: number,
        customParams?: Partial<TreeParams>
    ): BranchNode {
        const params = { ...this.DEFAULT_PARAMS, ...customParams };
        
        return this.createNode(
            startPos,
            initialAngle,
            initialLength,
            initialLength * 0.15, // initial width
            0,  // depth
            params
        );
    }

    private createNode(
        position: Vector2,
        angle: number,
        length: number,
        width: number,
        depth: number,
        params: TreeParams
    ): BranchNode {
        const node: BranchNode = {
            position,
            angle,
            length,
            width,
            children: [],
            growth: 0,
            path: undefined
        };

        // Stop if we've reached max depth
        if (depth >= params.maxDepth) return node;

        // Determine number of branches based on depth
        const branchCount = this.getBranchCount(depth, params);

        for (let i = 0; i < branchCount; i++) {
            const childAngle = this.getChildAngle(angle, i, branchCount, params);
            const childLength = length * this.getStyleConstrained(
                params.lengthReductionFactor,
                'minLengthRatio',
                'maxLengthRatio'
            );
            const childWidth = width * this.getStyleConstrained(
                params.widthReductionFactor,
                'minWidthRatio',
                'maxWidthRatio'
            );

            const childPos = {
                x: position.x + Math.cos(angle) * length,
                y: position.y + Math.sin(angle) * length
            };

            const child = this.createNode(
                childPos,
                childAngle,
                childLength,
                childWidth,
                depth + 1,
                params
            );

            node.children.push(child);
        }

        return node;
    }

    private getBranchCount(depth: number, params: TreeParams): number {
        // Reduce branch count with depth for aesthetic balance
        const maxBranches = Math.max(2, params.maxBranchesPerNode - depth);
        return depth === 0 ? 2 : 2 + Math.floor(Math.random() * (maxBranches - 1));
    }

    private getChildAngle(
        parentAngle: number,
        index: number,
        totalBranches: number,
        params: TreeParams
    ): number {
        const baseAngle = this.STYLE_CONSTRAINTS.minBranchAngle;
        const maxAngle = this.STYLE_CONSTRAINTS.maxBranchAngle;
        
        // Calculate angle based on position in branch array
        const spreadFactor = (index / (totalBranches - 1)) * 2 - 1;
        const angleSpread = baseAngle + 
            (maxAngle - baseAngle) * Math.abs(spreadFactor);
        
        // Add controlled randomness
        const noise = this.noise2D(parentAngle + index, index) * 
            params.branchAngleVariance;
        
        return parentAngle + angleSpread * spreadFactor + noise;
    }

    private getStyleConstrained(
        value: number,
        minKey: keyof typeof this.STYLE_CONSTRAINTS,
        maxKey: keyof typeof this.STYLE_CONSTRAINTS
    ): number {
        return Math.max(
            this.STYLE_CONSTRAINTS[minKey],
            Math.min(this.STYLE_CONSTRAINTS[maxKey], value)
        );
    }

    updateGrowth(root: BranchNode, deltaTime: number, growthRate: number = 1): void {
        const updateNode = (node: BranchNode) => {
            // Update current node growth
            node.growth = Math.min(1, node.growth + deltaTime * growthRate);
            
            // Only start growing children once parent is partially grown
            if (node.growth > 0.3) {
                node.children.forEach(child => updateNode(child));
            }
        };

        updateNode(root);
    }

    generatePaths(root: BranchNode): void {
        const generateNodePath = (node: BranchNode) => {
            if (node.growth <= 0) return;

            const path = new Path2D();
            const endX = node.position.x + Math.cos(node.angle) * node.length * node.growth;
            const endY = node.position.y + Math.sin(node.angle) * node.length * node.growth;

            // Create branch shape
            const halfWidth = node.width * 0.5;
            const perpAngle = node.angle + Math.PI / 2;
            
            // Start at base left
            const startLeft = {
                x: node.position.x + Math.cos(perpAngle) * halfWidth,
                y: node.position.y + Math.sin(perpAngle) * halfWidth
            };
            
            path.moveTo(startLeft.x, startLeft.y);

            // Draw to tip
            const tipWidth = halfWidth * (1 - node.growth * 0.5);
            const controlPoint1 = {
                x: node.position.x + Math.cos(node.angle) * node.length * 0.5,
                y: node.position.y + Math.sin(node.angle) * node.length * 0.5
            };
            
            path.quadraticCurveTo(
                controlPoint1.x,
                controlPoint1.y,
                endX,
                endY
            );

            // Draw back to base right
            const startRight = {
                x: node.position.x + Math.cos(perpAngle + Math.PI) * halfWidth,
                y: node.position.y + Math.sin(perpAngle + Math.PI) * halfWidth
            };
            
            path.lineTo(startRight.x, startRight.y);
            path.closePath();

            node.path = path;

            // Generate paths for children
            node.children.forEach(child => {
                if (node.growth > 0.3) {
                    generateNodePath(child);
                }
            });
        };

        generateNodePath(root);
    }

    drawTree(
        ctx: CanvasRenderingContext2D, 
        root: BranchNode,
        colors: {
            trunk: HSLColor,
            highlight: HSLColor
        }
    ): void {
        const drawNode = (node: BranchNode) => {
            if (!node.path || node.growth <= 0) return;

            ctx.save();

            // Create gradient for branch
            const gradient = ctx.createLinearGradient(
                node.position.x,
                node.position.y,
                node.position.x + Math.cos(node.angle) * node.length,
                node.position.y + Math.sin(node.angle) * node.length
            );

            gradient.addColorStop(0, ColorSystem.toHSLString(colors.trunk));
            gradient.addColorStop(1, ColorSystem.toHSLString(colors.highlight));

            ctx.fillStyle = gradient;
            ctx.fill(node.path);

            // Draw children
            node.children.forEach(child => {
                if (node.growth > 0.3) {
                    drawNode(child);
                }
            });

            ctx.restore();
        };

        drawNode(root);
    }
}