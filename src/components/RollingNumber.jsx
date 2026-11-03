import React from 'react';

// Keep the real catalog value available to assistive technology throughout motion.
export default function RollingNumber({ value, animate }) {
  return (
    <strong className="rolling-number" data-animate={animate}>
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
