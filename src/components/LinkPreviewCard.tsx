import React from "react";

export default function LinkPreviewCard({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block rounded-lg border border-slate-600/60 bg-slate-900/60 px-2 py-1 text-xs text-sky-300 hover:underline break-all">
      {url}
    </a>
  );
}
