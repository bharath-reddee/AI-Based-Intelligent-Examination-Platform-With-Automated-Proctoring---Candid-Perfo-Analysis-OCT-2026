import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathFormula = ({ text, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!text || typeof text !== 'string') {
      return '';
    }

    
    if (!text.includes('$')) {
      return text;
    }

    
    
    const parts = [];
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      const raw = match[0];
      const isDisplay = raw.startsWith('$$') && raw.endsWith('$$');
      const formula = isDisplay ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();

      try {
        const html = katex.renderToString(formula, {
          displayMode: isDisplay,
          throwOnError: false,
        });
        parts.push({
          type: 'math',
          html,
        });
      } catch (err) {
        
        parts.push({
          type: 'text',
          content: raw,
        });
      }

      lastIndex = regex.lastIndex;
    }

    
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return parts;
  }, [text]);

  if (typeof renderedContent === 'string') {
    return <span className={className}>{renderedContent}</span>;
  }

  return (
    <span className={`math-formula-container inline ${className}`}>
      {renderedContent.map((part, idx) => {
        if (part.type === 'text') {
          return <span key={idx}>{part.content}</span>;
        }
        return (
          <span
            key={idx}
            className="inline-math px-0.5"
            dangerouslySetInnerHTML={{ __html: part.html }}
          />
        );
      })}
    </span>
  );
};

export default MathFormula;
