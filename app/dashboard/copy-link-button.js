"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="btn secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          // Clipboard can be blocked (permissions, non-HTTPS); fall back to a prompt.
          window.prompt("Copy your booking link:", url);
          return;
        }
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
