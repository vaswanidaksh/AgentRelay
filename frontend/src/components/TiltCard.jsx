import { useState, useRef } from 'react';

/**
 * TiltCard — Subtle 3D perspective tilt + cursor spotlight.
 * Max 5 degrees, silver spotlight. Non-flashy, tactile.
 */
export default function TiltCard({
  children,
  className = '',
  maxTilt = 5,
  onClick,
  tag: Tag = 'div',
  ...props
}) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const [spotlight, setSpotlight] = useState({ opacity: 0, x: 0, y: 0 });
  const rafRef = useRef(null);

  const onMouseMove = (e) => {
    if (!ref.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotX = ((y - cy) / cy) * -maxTilt;
      const rotY = ((x - cx) / cx) * maxTilt;

      setStyle({
        transform: `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02,1.02,1.02)`,
        transition: 'transform 0.18s cubic-bezier(0.23,1,0.32,1)',
      });
      setSpotlight({ opacity: 1, x, y });
    });
  };

  const onMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
      transition: 'transform 0.45s cubic-bezier(0.23,1,0.32,1)',
    });
    setSpotlight((p) => ({ ...p, opacity: 0 }));
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Cursor spotlight — silver radial */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(280px circle at ${spotlight.x}px ${spotlight.y}px, rgba(200,200,210,0.10), transparent 75%)`,
        }}
      />
      {children}
    </Tag>
  );
}
