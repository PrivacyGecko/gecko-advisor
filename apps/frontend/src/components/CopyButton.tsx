import React from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <button onClick={copy} className="px-3 py-3 min-h-[44px] rounded border text-sm">
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}

