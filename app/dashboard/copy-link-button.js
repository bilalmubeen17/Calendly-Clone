"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="btn secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
