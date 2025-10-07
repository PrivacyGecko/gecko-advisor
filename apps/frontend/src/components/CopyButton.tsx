import React from 'react';
import toast from 'react-hot-toast';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy link');
    }
  }
  return (
    <button onClick={copy} className="px-3 py-3 min-h-[44px] rounded border text-sm">
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}

