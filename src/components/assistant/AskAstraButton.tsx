import React from 'react';
import { Sparkles } from 'lucide-react';
import { requestAstra } from '@/astra/runtime';

interface AskAstraButtonProps {
  question: string;
  label?: string;
  className?: string;
}

/** Small inline entry point: "Explain this chart / number / panel". */
export const AskAstraButton: React.FC<AskAstraButtonProps> = ({ question, label = 'Explain', className = '' }) => (
  <button
    type="button"
    className={`ask-astra-button ${className}`}
    onClick={(e) => { e.stopPropagation(); requestAstra({ kind: 'ask', question }); }}
    aria-label={`Ask Astra: ${question}`}
    title={`Ask Astra: ${question}`}
  >
    <Sparkles size={12} />
    <span>{label}</span>
  </button>
);

export default AskAstraButton;
