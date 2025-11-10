
import React from 'react';

export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.69-8.69a2.25 2.25 0 00-3.18 0l-8.69 8.69a.75.75 0 001.06 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.026.026.05.054.07.084v6.101a2.25 2.25 0 01-2.25 2.25H15a2.25 2.25 0 01-2.25-2.25v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v4.5A2.25 2.25 0 016 21.75H5.25a2.25 2.25 0 01-2.25-2.25V13.675c.02-.03.044-.058.07-.084L12 5.432z" />
  </svg>
);
