import { ReactElement } from 'react';

export default function MoniShareIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      {/* Smoke lines */}
      <path
        d="M78 20 C72 28, 86 32, 80 40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M92 18 C86 26, 100 30, 94 38"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Car body */}
      <rect
        x="25"
        y="55"
        width="70"
        height="25"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Car top */}
      <path
        d="M35 55 L45 42 H65 L75 55"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Exhaust pipe */}
      <path
        d="M95 65 H105"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Wheels */}
      <circle cx="45" cy="85" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="75" cy="85" r="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
