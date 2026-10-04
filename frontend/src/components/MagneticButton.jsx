import { useState, useRef } from 'react';

/**
 * MagneticButton — A subtle magnetic CTA button component.
 * Gently shifts towards the cursor by a few pixels on hover, providing tactile feedback.
 */
export default function MagneticButton({
  children,
  className = '',
  maxOffset = 5,
  onClick,
  ...props
}) {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    const offsetX = (distanceX / (rect.width / 2)) * maxOffset;
    const offsetY = (distanceY / (rect.height / 2)) * maxOffset;

    setPosition({ x: offsetX, y: offsetY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `translate3d(${position.x.toFixed(2)}px, ${position.y.toFixed(2)}px, 0px)`,
        transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease',
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}
