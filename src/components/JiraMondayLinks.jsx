import React from 'react';
import { ExternalLink } from 'lucide-react';

const linkClass =
  'font-mono text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5';

/**
 * @param {{ key: string, href: string }[]} jiraLinks
 * @param {string|null} mondayUrl
 */
export default function JiraMondayLinks({ jiraLinks = [], mondayUrl = null, compact = false }) {
  const hasJira = jiraLinks.length > 0;
  const hasMonday = mondayUrl && /^https?:\/\//i.test(mondayUrl);

  if (!hasJira && !hasMonday) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {hasJira && (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {jiraLinks.map(({ key, href }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              title={`Open ${key} in Jira`}
            >
              {key}
              <ExternalLink size={compact ? 10 : 11} className="opacity-60 shrink-0" strokeWidth={2} />
            </a>
          ))}
        </span>
      )}
      {hasJira && hasMonday && <span className="text-slate-300 select-none">·</span>}
      {hasMonday && (
        <a
          href={mondayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center gap-0.5 font-medium text-xs"
          title="Open in Monday.com"
        >
          Monday
          <ExternalLink size={compact ? 10 : 11} className="opacity-60 shrink-0" strokeWidth={2} />
        </a>
      )}
    </span>
  );
}
