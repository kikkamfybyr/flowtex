import React from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface PreviewTexProps {
  text: string;
}

export const PreviewTex: React.FC<PreviewTexProps> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="tex-preview">
      {lines.map((line, i) => {
        // If the line contains TeX macros but no math delimiters,
        // wrap in $ to force KaTeX rendering for \ce{}
        const hasTeXMacro = line.includes('\\ce{');
        const displayString = hasTeXMacro && !line.includes('$') && !line.includes('\\(')
          ? `$${line}$`
          : line;

        try {
          return (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              <span className="tex-preview-line"><Latex>{displayString}</Latex></span>
            </React.Fragment>
          );
        } catch (e) {
          return (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              <span className="tex-preview-line tex-preview-error">{line}</span>
            </React.Fragment>
          );
        }
      })}
    </div>
  );
};
