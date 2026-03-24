import React from 'react';
import { productAreaBadgeClass } from '../data/constants.js';

export default function ProductAreaBadge({ area, className = '' }) {
  if (!area) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium leading-snug max-w-[11rem] truncate ${productAreaBadgeClass(area)} ${className}`}
    >
      {area}
    </span>
  );
}
