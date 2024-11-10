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
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Initialize and start render loop
        initializeSystems(canvas);
        renderFrame(ctx, 0);

        return cleanup;
    }, [initializeSystems, renderFrame, cleanup]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      handleClick(x, y, rect.height);
  };

    return (
        <canvas
            ref={canvasRef}
            className="w-screen h-screen"
            onClick={handleCanvasClick}
            style={{ imageRendering: 'crisp-edges' }}
        />
    );
};