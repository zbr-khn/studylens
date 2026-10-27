import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a({ href, children, ...props }: any) {
            const isSafe = href && /^https?:\/\//i.test(href);
            if (!isSafe) {
              return <span className="text-muted underline cursor-not-allowed" title="Blocked unsafe link">{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  if (href && window.api?.openExternal) {
                    window.api.openExternal(href);
                  } else {
                    window.open(href, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="text-accent-light underline hover:text-white transition-colors cursor-pointer"
                {...props}
              >
                {children}
              </a>
            );
          },
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline) {
              return <CodeBlock language={match ? match[1] : ''} code={codeString} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          h3({ children }) {
            const text = String(children);
            // Highlight academic answer sections
            if (text.includes('SHORT ANSWER')) {
              return (
                <div className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-purple-500/30 text-purple-300 font-bold uppercase tracking-wider text-xs">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  SHORT ANSWER
                </div>
              );
            }
            if (text.includes('WHY')) {
              return (
                <div className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-blue-500/30 text-blue-300 font-bold uppercase tracking-wider text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  THEORETICAL INTUITION & WHY
                </div>
              );
            }
            if (text.includes('EXAMPLE') || text.includes('PROOF')) {
              return (
                <div className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-emerald-500/30 text-emerald-300 font-bold uppercase tracking-wider text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  EXAMPLE / PROOF
                </div>
              );
            }
            if (text.includes('FROM YOUR COURSE MATERIAL')) {
              return (
                <div className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  FROM YOUR COURSE MATERIAL
                </div>
              );
            }
            if (text.includes('ADDITIONAL EXPLANATION')) {
              return (
                <div className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-cyan-500/30 text-cyan-300 font-bold uppercase tracking-wider text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  ADDITIONAL ACADEMIC EXPLANATION
                </div>
              );
            }
            return <h3 className="text-base font-semibold text-text mt-3 mb-1">{children}</h3>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-surface-border bg-[#0C0E12]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#14171F] border-b border-surface-border text-xs text-muted font-mono">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-muted hover:text-text transition-colors p-1 rounded hover:bg-white/5"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm font-mono text-gray-200 !bg-transparent !border-0 !m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
};
