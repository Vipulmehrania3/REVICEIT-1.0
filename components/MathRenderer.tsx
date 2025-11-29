import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

declare global {
  interface Window {
    katex: any;
  }
}

const MathRenderer: React.FC<MathRendererProps> = ({ text, className = "", inline = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!text) {
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    if (containerRef.current && window.katex) {
      // Basic regex to split text by $ or $$
      // Segments: even indices are text, odd indices are math.
      const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);

      containerRef.current.innerHTML = '';

      parts.forEach((part) => {
        const span = document.createElement('span');
        if (part.startsWith('$$') && part.endsWith('$$')) {
          try {
             // Remove $$ and render block math
             window.katex.render(part.slice(2, -2), span, { displayMode: true, throwOnError: false });
          } catch (e) {
             span.textContent = part;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
           try {
             // Remove $ and render inline math
             window.katex.render(part.slice(1, -1), span, { displayMode: false, throwOnError: false });
           } catch (e) {
             span.textContent = part;
           }
        } else {
          span.textContent = part;
        }
        containerRef.current?.appendChild(span);
      });
    } else if (containerRef.current) {
        // Fallback if KaTeX isn't loaded yet
        containerRef.current.textContent = text;
    }
  }, [text]);

  if (!text) return null;

  return <span ref={containerRef} className={className} />;
};

export default MathRenderer;