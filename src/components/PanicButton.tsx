import { useState, useRef, useCallback } from 'react';

const HOLD_DURATION = 3000;
const CIRCLE_RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

interface PanicButtonProps {
  onTrigger: () => void;
}

const PanicButton = ({ onTrigger }: PanicButtonProps) => {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(pct);

    if (pct >= 1) {
      // Vibrate on completion
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setHolding(false);
      setProgress(0);
      onTrigger();
      return;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [onTrigger]);

  const handleStart = () => {
    setHolding(true);
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(animate);
  };

  const handleEnd = () => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  };

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring */}
      <div
        className={`absolute h-52 w-52 rounded-full bg-primary/20 ${
          !holding ? 'panic-idle' : ''
        }`}
      />

      {/* SVG Progress Ring */}
      <svg
        className="absolute h-48 w-48"
        viewBox="0 0 180 180"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="90"
          cy="90"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="hsl(var(--primary) / 0.25)"
          strokeWidth="6"
        />
        {holding && (
          <circle
            cx="90"
            cy="90"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-none"
          />
        )}
      </svg>

      {/* Main button */}
      <button
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        className={`relative z-10 flex h-44 w-44 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform active:scale-95 ${
          holding ? 'scale-95' : ''
        }`}
        aria-label="Tombol Darurat — tahan 3 detik"
      >
        <span className="text-4xl">🚨</span>
        <span className="mt-1 text-base font-bold tracking-wide">DARURAT</span>
        <span className="text-xs opacity-80">Tahan 3 detik</span>
      </button>
    </div>
  );
};

export default PanicButton;
