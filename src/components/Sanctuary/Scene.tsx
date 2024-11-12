import React, { useRef, useEffect } from 'react';
import { useSanctuary } from '../../hooks/useSanctuary';

export const Scene: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { initializeSystems, renderFrame, cleanup, handleClick } = useSanctuary();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set up canvas with proper scaling
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Apply proper scaling
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(dpr, dpr);

        // Initialize systems and start render loop
        initializeSystems(canvas);
        
        // Start animation loop
        let frameId = requestAnimationFrame(function animate(time) {
            renderFrame(ctx, time);
            frameId = requestAnimationFrame(animate);
        });

        // Cleanup
        return () => {
            cancelAnimationFrame(frameId);
            cleanup();
        };
    }, [initializeSystems, renderFrame, cleanup]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate proper coordinates with DPR scaling
        const x = (event.clientX - rect.left) * dpr;
        const y = (event.clientY - rect.top) * dpr;
        
        handleClick(x, y, rect.height);
    };

    return (
        <canvas
            ref={canvasRef}
            className="w-screen h-screen touch-none"
            onClick={handleCanvasClick}
            style={{ 
                imageRendering: 'crisp-edges',
                WebkitTapHighlightColor: 'transparent'
            }}
        />
    );
};