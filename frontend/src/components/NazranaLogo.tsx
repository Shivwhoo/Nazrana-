import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function NazranaLogo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 76 76" 
      className={className}
      {...props}
    >
      <g transform="rotate(-7 38 38)">
        <circle cx="38" cy="38" r="34" fill="none" stroke="currentColor" strokeWidth="3"/>
        <circle cx="38" cy="38" r="27" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 7"/>
        <ellipse cx="38" cy="20" rx="5.5" ry="10" fill="#D9A441"/>
        <ellipse cx="38" cy="56" rx="5.5" ry="10" fill="#D9A441"/>
        <ellipse cx="20" cy="38" rx="10" ry="5.5" fill="#D9A441"/>
        <ellipse cx="56" cy="38" rx="10" ry="5.5" fill="#D9A441"/>
        <ellipse cx="24.5" cy="24.5" rx="5.5" ry="10" transform="rotate(45 24.5 24.5)" fill="#B23A1E"/>
        <ellipse cx="51.5" cy="24.5" rx="5.5" ry="10" transform="rotate(-45 51.5 24.5)" fill="#B23A1E"/>
        <ellipse cx="24.5" cy="51.5" rx="5.5" ry="10" transform="rotate(-45 24.5 51.5)" fill="#B23A1E"/>
        <ellipse cx="51.5" cy="51.5" rx="5.5" ry="10" transform="rotate(45 51.5 51.5)" fill="#B23A1E"/>
        <circle cx="38" cy="38" r="7" fill="currentColor"/>
      </g>
    </svg>
  );
}

export function NazranaMonogram({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 76 76" 
      className={className}
      {...props}
    >
      <g transform="rotate(-7 38 38)">
        <circle cx="38" cy="38" r="34" fill="currentColor"/>
        <text x="38" y="49" textAnchor="middle" fontFamily="sans-serif" fontWeight="600" fontSize="34" fill="white">n</text>
      </g>
    </svg>
  );
}
