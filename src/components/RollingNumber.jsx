import React, { useEffect, useRef, useState } from 'react';

// Keep the real catalog value available to assistive technology throughout motion.
export default function RollingNumber({ value, reducedMotion }) {
  const numberRef = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    setInView(false);
    if (reducedMotion || !window.IntersectionObserver) return;
    const headerHeight =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--app-header-height')
      ) || 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.75) setInView(true);
        // A partly clipped number must not restart on every small scroll.
        else if (!entry.isIntersecting) setInView(false);
      },
      { threshold: [0, 0.75], rootMargin: `-${headerHeight}px 0px 0px 0px` }
    );
    observer.observe(numberRef.current);
    return () => observer.disconnect();
  }, [reducedMotion]);
  return (
    <strong ref={numberRef} className="rolling-number" data-animate={inView && !reducedMotion}>
      <span className="sr-only">{value}</span>
      <span className="rolling-number-visual" aria-hidden="true">
        {String(value)
          .split('')
          .map((digit, index) => (
            <span className="rolling-digit" key={index}>
              <span
                className="rolling-digit-strip"
                style={{ '--digit-steps': 10 + Number(digit), '--digit-order': index }}
              >
                {Array.from({ length: 11 + Number(digit) }, (_, step) => (
                  <span key={step}>{step % 10}</span>
                ))}
              </span>
            </span>
          ))}
      </span>
    </strong>
  );
}
