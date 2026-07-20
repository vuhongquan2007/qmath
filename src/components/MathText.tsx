import { useEffect, useState } from "react";

declare global {
  interface Window {
    katex?: {
      renderToString: (tex: string, options?: any) => string;
    };
  }
}

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className = "" }: MathTextProps) {
  const [isKatexLoaded, setIsKatexLoaded] = useState(false);

  useEffect(() => {
    // Check if katex is loaded on window
    const checkKatex = () => {
      if (window.katex) {
        setIsKatexLoaded(true);
      } else {
        // Try again in 100ms
        setTimeout(checkKatex, 100);
      }
    };
    checkKatex();
  }, []);

  if (!text) return null;

  // Split text by block math ($$) and inline math ($)
  // We use regex that matches:
  // - $$math$$ (group 1)
  // - $math$ (group 2)
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);

  return (
    <span className={`inline-wrap ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const rawMath = part.slice(2, -2).trim();
          if (isKatexLoaded && window.katex) {
            try {
              const html = window.katex.renderToString(rawMath, {
                displayMode: true,
                throwOnError: false,
              });
              return (
                <div
                  key={index}
                  className="my-3 overflow-x-auto py-1 max-w-full text-center"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch (e) {
              console.error("KaTeX block error:", e);
              return (
                <div key={index} className="my-2 bg-slate-100 p-2 rounded font-mono text-center text-sm overflow-x-auto">
                  {rawMath}
                </div>
              );
            }
          } else {
            return (
              <div key={index} className="my-2 bg-slate-100 p-2 rounded font-mono text-center text-sm overflow-x-auto">
                {rawMath}
              </div>
            );
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const rawMath = part.slice(1, -1).trim();
          if (isKatexLoaded && window.katex) {
            try {
              const html = window.katex.renderToString(rawMath, {
                displayMode: false,
                throwOnError: false,
              });
              return (
                <span
                  key={index}
                  className="inline-block px-0.5 align-middle"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch (e) {
              console.error("KaTeX inline error:", e);
              return (
                <code key={index} className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs text-rose-600">
                  {rawMath}
                </code>
              );
            }
          } else {
            return (
              <code key={index} className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs text-rose-600">
                {rawMath}
              </code>
            );
          }
        } else {
          // Regular text
          // Handle linebreaks in plain text
          if (part.includes("\n")) {
            return (
              <span key={index}>
                {part.split("\n").map((line, lineIdx) => (
                  <span key={lineIdx}>
                    {line}
                    {lineIdx < part.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
}
