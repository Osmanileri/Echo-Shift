/**
 * AnimatedCounter Component
 * Smooth number roll-up animation with ease-out timing
 */

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number; // Animation duration in ms
    className?: string;
    prefix?: string;
    suffix?: string;
}

/**
 * Ease-out exponential function for smooth deceleration
 */
function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 1000,
    className = '',
    prefix = '',
    suffix = '',
}) => {
    const [displayValue, setDisplayValue] = useState(value);
    const startValue = useRef(value);
    const startTime = useRef<number | null>(null);
    const rafId = useRef<number | null>(null);

    useEffect(() => {
        // Skip animation if this is the first render with the same value
        if (startValue.current === value) {
            setDisplayValue(value);
            return;
        }

        // Store starting point
        startValue.current = displayValue;
        startTime.current = null;

        const animate = (timestamp: number) => {
            if (!startTime.current) startTime.current = timestamp;
            const elapsed = timestamp - startTime.current;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);

            const current = Math.floor(
                startValue.current + (value - startValue.current) * easedProgress
            );

            setDisplayValue(current);

            if (progress < 1) {
                rafId.current = requestAnimationFrame(animate);
            } else {
                // Ensure we end on exact value
                setDisplayValue(value);
            }
        };

        rafId.current = requestAnimationFrame(animate);

        return () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
            }
        };
    }, [value, duration]);

    // Format number with thousand separators
    const formattedValue = new Intl.NumberFormat('tr-TR').format(displayValue);

    return (
        <span
            className={className}
            style={{
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
            }}
        >
            {prefix}{formattedValue}{suffix}
        </span>
    );
};

export default AnimatedCounter;
