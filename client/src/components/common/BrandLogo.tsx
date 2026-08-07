import React from 'react';

interface BrandLogoProps {
  size?: number;
  glow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28 }) => {
  return (
    <img 
      src="/favicon.png" 
      alt="LMage Logo" 
      width={size} 
      height={size} 
      style={{ borderRadius: '6px', objectFit: 'contain' }}
      aria-label="LMage Pro"
    />
  );
};
