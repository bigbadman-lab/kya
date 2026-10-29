"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

export interface CountNumberProps {
  value: number;
  from?: number;
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  prefix?: string;
  suffix?: string;
  damping?: number;
  stiffness?: number;
  mass?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function CountNumber({
  value,
  from,
  delay = 0,
  duration = 1,
  className = "",
  startWhen = true,
  separator = "",
  prefix = "",
  suffix = "",
  damping = 18,
  stiffness = 45,
  mass = 1,
  onStart,
  onEnd,
}: CountNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInitialRender = useRef(true);

  // If 'from' is provided, start from it; otherwise start from 0 on first view
  const initialValue = from !== undefined ? from : 0;
  const motionValue = useMotionValue(initialValue);

  // Gentle, slower spring for a clear and visible count transition
  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
    mass,
  });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  const formatValue = useCallback(
    (latest: number) => {
      const rounded = Math.round(latest);
      const formattedNumber = separator
        ? Intl.NumberFormat("en-US", { useGrouping: true })
            .format(rounded)
            .replace(/,/g, separator)
        : rounded.toString();

      return `${prefix}${formattedNumber}${suffix}`;
    },
    [prefix, suffix, separator]
  );

  // Initial animation when scrolled into view
  useEffect(() => {
    if (isInView && startWhen && isInitialRender.current) {
      isInitialRender.current = false;
      onStart?.();

      const timeoutId = setTimeout(() => {
        motionValue.set(value);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(() => {
        onEnd?.();
      }, delay * 1000 + duration * 1000);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, value, delay, duration, motionValue, onStart, onEnd]);

  // Reactive animation whenever `value` increases or decreases (e.g. Monthly <-> Annually)
  useEffect(() => {
    if (!isInitialRender.current) {
      motionValue.set(value);
    }
  }, [value, motionValue]);

  // Fast direct DOM update on every spring tick
  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue]);

  return (
    <span className={className} ref={ref}>
      {formatValue(initialValue)}
    </span>
  );
}

export default CountNumber;
