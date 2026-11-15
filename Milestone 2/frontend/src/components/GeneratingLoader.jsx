import React from 'react';

const GeneratingLoader = ({
  title = 'Generating questions with AI',
  subtitle = 'Preparing questions based on your selected subject, topic, and difficulty.',
  ariaLabel = 'Generating questions with AI',
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={`practice-loader-container flex flex-col items-center justify-center text-center py-6 px-4 w-full select-none ${className}`}
    >
      
      <div className="loader-wrapper" aria-hidden="true">
        <span className="loader-letter">G</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">r</span>
        <span className="loader-letter">a</span>
        <span className="loader-letter">t</span>
        <span className="loader-letter">i</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">g</span>
        <div className="loader" />
      </div>

      
      <span className="sr-only">{ariaLabel}</span>

      
      <div className="mt-8 space-y-1.5 max-w-sm">
        <h2 className="text-base sm:text-lg font-bold text-[#202B40] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[#718096] font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default GeneratingLoader;

