import React from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface PreviewTexProps {
  text: string;
}

export const PreviewTex: React.FC<PreviewTexProps> = ({ text }) => {
  // If the text contains TeX macros but no math delimiters, 
  // we can heuristically wrap it in $$ to force KaTeX rendering for \ce{}
  const hasTeXMacro = text.includes('\\ce{');
  const displayString = hasTeXMacro && !text.includes('$') && !text.includes('\\(') 
    ? `$${text}$` 
    : text;

  try {
    return (
      <div className="tex-preview">
        <Latex>{displayString}</Latex>
      </div>
    );
  } catch (e) {
    return <div className="tex-preview-error">{text}</div>;
  }
};
