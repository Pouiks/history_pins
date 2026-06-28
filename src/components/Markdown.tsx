// Mini-renderer Markdown sûr (sans dépendance, sans dangerouslySetInnerHTML).
// Supporte : titres ## / ###, paragraphes, citations >, listes -, et en ligne
// **gras**, *italique*, [lien](url). Suffisant pour des articles rédigés.

import { Fragment, type ReactNode } from 'react';

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

/** Rend le gras / italique / liens d'une ligne. */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE).filter((p) => p !== '');
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={i} href={link[2]} className="underline decoration-[#c8b89a] underline-offset-2 hover:text-[#9a3412]">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ content }: { content: string }) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        const lines = block.split('\n');

        if (block.startsWith('### ')) {
          return (
            <h3 key={i} className="font-serif text-xl font-semibold text-[#221f1b]">
              {renderInline(block.slice(4))}
            </h3>
          );
        }
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="mt-2 font-serif text-2xl font-semibold text-[#221f1b]">
              {renderInline(block.slice(3))}
            </h2>
          );
        }
        if (lines.every((l) => l.startsWith('> '))) {
          return (
            <blockquote
              key={i}
              className="rounded-r border-l-4 border-[#c8b89a] bg-[#fcf8ef] px-4 py-3 text-[#3a352e]"
            >
              {renderInline(lines.map((l) => l.slice(2)).join(' '))}
            </blockquote>
          );
        }
        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-[1.05rem] leading-relaxed text-[#3a352e]">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[1.05rem] leading-relaxed text-[#3a352e]">
            {renderInline(lines.join(' '))}
          </p>
        );
      })}
    </div>
  );
}
