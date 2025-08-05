import React from 'react';

interface KpiCardProps {
  text: string;
  index?: number; // Optional index for animation
  className?: string; // Additional className prop
}

export default function KpiCard({ text, index = 0, className = '' }: KpiCardProps) {
  // Safely truncate long text
  const truncatedText = text.length > 200 ? `${text.substring(0, 200)}...` : text;

  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 
        shadow-md hover:shadow-lg 
        rounded-lg p-4 
        transition-all duration-300 
        border-l-4 border-blue-500
        ${className}
      `}
      style={{
        animationDelay: `${index * 50}ms`, // Stagger animations
        
      }}
    >
      <p className="text-gray-800 dark:text-gray-100 text-sm md:text-base">
        {truncatedText.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}