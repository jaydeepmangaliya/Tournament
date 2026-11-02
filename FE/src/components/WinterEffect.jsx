import React, { useEffect, useRef } from 'react';

export default function WinterEffect() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Number of soft snowfall particles based on viewport
    const particleCount = width < 768 ? 40 : 65;

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8, // 0.8px to 3.0px
        color: Math.random() > 0.3 ? 'rgba(235, 245, 255, ' : 'rgba(180, 225, 255, ',
        alpha: Math.random() * 0.6 + 0.25,
        speedY: Math.random() * 1.1 + 0.5,
        speedX: Math.random() * 0.8 - 0.4,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    let lastTime = performance.now();

    const render = (time) => {
      const delta = Math.min(32, time - lastTime) / 16.6;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Gentle natural swaying physics
        p.angle += p.angularSpeed * delta;
        p.y += p.speedY * delta;
        p.x += (Math.sin(p.angle) * 0.65 + p.speedX) * delta;

        // Wrap around boundaries
        if (p.y > height + 5) {
          p.y = -5;
          p.x = Math.random() * width;
        }
        if (p.x > width + 5) {
          p.x = -5;
        } else if (p.x < -5) {
          p.x = width + 5;
        }

        // Draw soft glowing snowflake
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.4);
        gradient.addColorStop(0, `${p.color}${p.alpha})`);
        gradient.addColorStop(0.5, `${p.color}${p.alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.radius * 1.4, 0, Math.PI * 2, false);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* 1. Snowfall Particle Canvas (Always on automatically, zero click interference) */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-30"
        style={{ width: '100vw', height: '100vh' }}
      />

      {/* 2. Top Frosted Vignette with Subtle Icy Glimmer */}
      <div className="fixed top-0 left-0 right-0 h-10 bg-gradient-to-b from-cyan-500/10 via-sky-500/5 to-transparent pointer-events-none z-20" />
    </>
  );
}
