"use client";

import { useEffect, useRef } from 'react';

const DEFAULT_POINTER_X = '78%';
const DEFAULT_POINTER_Y = '18%';
const DEFAULT_SCROLL_RATIO = '0';

export default function AmbientBackdrop() {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = backdropRef.current;
    if (!element) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      element.style.setProperty('--ambient-pointer-x', DEFAULT_POINTER_X);
      element.style.setProperty('--ambient-pointer-y', DEFAULT_POINTER_Y);
      element.style.setProperty('--ambient-scroll-ratio', DEFAULT_SCROLL_RATIO);
      return;
    }

    let frameId = 0;
    let pointerX = window.innerWidth * 0.78;
    let pointerY = window.innerHeight * 0.18;

    const commit = () => {
      frameId = 0;
      const scrollableHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const scrollRatio = Math.min(window.scrollY / scrollableHeight, 1);
      element.style.setProperty('--ambient-pointer-x', `${pointerX}px`);
      element.style.setProperty('--ambient-pointer-y', `${pointerY}px`);
      element.style.setProperty('--ambient-scroll-ratio', scrollRatio.toFixed(3));
    };

    const requestCommit = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(commit);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      requestCommit();
    };

    const handleScroll = () => {
      requestCommit();
    };

    requestCommit();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div
      ref={backdropRef}
      aria-hidden="true"
      className="ambient-shell pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <div className="ambient-orb ambient-orb-three" />
      <div className="ambient-grid" />
      <div className="ambient-spotlight" />
      <div className="ambient-glow-trail" />
    </div>
  );
}
