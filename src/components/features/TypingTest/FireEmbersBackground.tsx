import React, { useEffect, useRef } from 'react';

interface FireEmbersBackgroundProps {
  isLightMode: boolean;
}

interface Ember {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string;
  fadeSpeed: number;
}

const FireEmbersBackground: React.FC<FireEmbersBackgroundProps> = ({ isLightMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let embers: Ember[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Color palettes for embers
    const darkEmbers = [
      'rgba(242, 62, 112, ', // Accent red
      'rgba(255, 182, 89, ', // Orange/yellow
      'rgba(125, 82, 255, ', // Purple/blue
      'rgba(209, 116, 255, ' // Light pink
    ];

    const lightEmbers = [
      'rgba(100, 116, 139, ', // slate-500
      'rgba(71, 85, 105, ',  // slate-600
      'rgba(148, 163, 184, ', // slate-400
      'rgba(125, 82, 255, '  // subtle accent purple
    ];

    const createEmber = (yStart = canvas.height): Ember => {
      const palette = isLightMode ? lightEmbers : darkEmbers;
      const baseColor = palette[Math.floor(Math.random() * palette.length)];
      
      return {
        x: Math.random() * canvas.width,
        y: yStart + Math.random() * 20,
        size: Math.random() * (isLightMode ? 2 : 4) + 1.5,
        speedY: -(Math.random() * 1.5 + 0.6),
        speedX: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * (isLightMode ? 0.22 : 0.65) + 0.1,
        color: baseColor,
        fadeSpeed: Math.random() * 0.0035 + 0.001
      };
    };

    // Initialize starting embers across screen height
    for (let i = 0; i < 45; i++) {
      embers.push(createEmber(Math.random() * canvas.height));
    }

    const draw = () => {
      // Clear background to transparent so it blends perfectly with Tailwind background gradient styles
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render embers
      for (let i = 0; i < embers.length; i++) {
        const ember = embers[i];
        ember.y += ember.speedY;
        ember.x += ember.speedX;
        ember.opacity -= ember.fadeSpeed;

        // Apply slight horizontal wave wind effect
        ember.speedX += (Math.random() - 0.5) * 0.08;

        if (ember.y < 0 || ember.opacity <= 0 || ember.x < 0 || ember.x > canvas.width) {
          embers[i] = createEmber();
        } else {
          ctx.beginPath();
          ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
          ctx.fillStyle = `${ember.color}${ember.opacity})`;
          
          // Only add glows in dark mode for premium cinematic feels!
          if (!isLightMode) {
            ctx.shadowColor = ember.color.replace('rgba', 'rgb').split(',').slice(0, 3).join(',') + ')';
            ctx.shadowBlur = ember.size * 2.2;
          } else {
            ctx.shadowBlur = 0;
          }
          
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isLightMode]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ mixBlendMode: isLightMode ? 'normal' : 'screen' }}
      />
      {/* Heavy dark vignette ONLY in dark mode! */}
      {!isLightMode && (
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,0.85)_100%)]" 
          style={{ mixBlendMode: 'multiply' }}
        />
      )}
    </div>
  );
};

export default FireEmbersBackground;
