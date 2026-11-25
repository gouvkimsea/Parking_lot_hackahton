import React from 'react';

interface TopDownCarSvgProps {
  /** Center X in parent SVG coordinates */
  cx: number;
  /** Center Y in parent SVG coordinates */
  cy: number;
  /** Rotation angle in degrees (0 = pointing right) */
  angle: number;
  /** Scale multiplier */
  scale?: number;
  /** Highlight subtly if reserved by current user */
  isUserReserved?: boolean;
}

/**
 * Crisp top-down lime car graphic matching the reference parking bay diagram.
 * Designed around origin (0, 0), oriented along the X axis (length 58, width 28).
 */
export const TopDownCarSvg: React.FC<TopDownCarSvgProps> = ({
  cx,
  cy,
  angle,
  scale = 1,
  isUserReserved = false,
}) => {
  const bodyFill = isUserReserved ? '#141517' : '#C2EB3D';
  const bodyStroke = isUserReserved ? '#C5EC45' : '#263010';
  const hoodHighlight = isUserReserved ? '#2C3036' : '#D9F673';
  const roofFill = isUserReserved ? '#C5EC45' : '#B5DF2F';
  const glassFill = '#1D2228';

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${angle}) scale(${scale})`}
      pointerEvents="none"
      aria-hidden="true"
    >
      {/* Soft ground shadow */}
      <rect x="-27" y="-12" width="56" height="27" rx="11" fill="rgba(20, 21, 23, 0.14)" />

      {/* Side mirrors */}
      <ellipse cx="7" cy="-14.5" rx="3" ry="2" fill={bodyFill} stroke={bodyStroke} strokeWidth="1" />
      <ellipse cx="7" cy="14.5" rx="3" ry="2" fill={bodyFill} stroke={bodyStroke} strokeWidth="1" />

      {/* Main chassis */}
      <rect
        x="-28"
        y="-13"
        width="56"
        height="26"
        rx="10.5"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth="1.4"
      />

      {/* Hood contour highlight */}
      <path
        d="M 10 -9.5 C 18 -9.5 24 -7 25.5 -4 L 25.5 4 C 24 7 18 9.5 10 9.5 Z"
        fill={hoodHighlight}
        opacity="0.7"
      />

      {/* Front windshield */}
      <path
        d="M 3 -9.5 L 13 -8 C 15 -4 15 4 13 8 L 3 9.5 C 4.5 4 4.5 -4 3 -9.5 Z"
        fill={glassFill}
      />

      {/* Rear windshield */}
      <path
        d="M -18 -8.2 L -11 -9.2 C -12.2 -4 -12.2 4 -11 9.2 L -18 8.2 C -20 4 -20 -4 -18 -8.2 Z"
        fill={glassFill}
      />

      {/* Side windows */}
      <path d="M -9 -10.5 L 1.5 -10.5 L 0 -8.2 L -8.5 -8.2 Z" fill={glassFill} />
      <path d="M -9 10.5 L 1.5 10.5 L 0 8.2 L -8.5 8.2 Z" fill={glassFill} />

      {/* Cabin roof */}
      <rect
        x="-10.5"
        y="-7.5"
        width="12.5"
        height="15"
        rx="3.5"
        fill={roofFill}
        stroke={bodyStroke}
        strokeWidth="0.8"
      />

      {/* Headlights */}
      <ellipse cx="25.5" cy="-7.2" rx="1.6" ry="3.2" fill="#FFFFFF" opacity="0.92" />
      <ellipse cx="25.5" cy="7.2" rx="1.6" ry="3.2" fill="#FFFFFF" opacity="0.92" />

      {/* Tail lights */}
      <rect x="-27.2" y="-8.5" width="1.6" height="4.8" rx="0.8" fill="#EF4444" opacity="0.85" />
      <rect x="-27.2" y="3.7" width="1.6" height="4.8" rx="0.8" fill="#EF4444" opacity="0.85" />
    </g>
  );
};
