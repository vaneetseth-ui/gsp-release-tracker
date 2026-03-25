/**
 * Glip / RingCentral team messaging webhook (v1.2).
 * Set GLIP_WEBHOOK_URL (env / `.env` via dotenv, or host config vars) to the RingCentral incoming webhook.
 */
export async function postGlipMessage(body) {
  const url = process.env.GLIP_WEBHOOK_URL?.trim();
  if (!url) {
    const err = new Error('Glip webhook not configured (set GLIP_WEBHOOK_URL)');
    err.code = 'NO_WEBHOOK';
    throw err;
  }
  const text =
    typeof body === 'string'
      ? body
      : [
          body.title && `**${body.title}**`,
          ...(Array.isArray(body.lines) ? body.lines : []),
          body.meta && `_${body.meta}_`,
        ]
          .filter(Boolean)
          .join('\n');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Glip webhook HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
}

export function formatNotifyCardPayload(reqBody) {
  const {
    partner,
    project_title,
    pmo_status,
    jira_number,
    priority_number,
    user_note,
    question,
    answer_summary,
  } = reqBody || {};
  const title = 'GSP Release Tracker';
  const lines = [];
  if (question) lines.push(`Question: ${question}`);
  if (answer_summary) lines.push(`Answer: ${answer_summary}`);
  if (partner) lines.push(`Partner: ${partner}`);
  if (project_title) lines.push(`Project: ${project_title}`);
  if (pmo_status) lines.push(`PMO status: ${pmo_status}`);
  if (jira_number) lines.push(`Jira: ${jira_number}`);
  if (priority_number != null) lines.push(`Priority #: ${priority_number}`);
  if (user_note) lines.push(`Note: ${user_note}`);
  lines.push(`Time: ${new Date().toISOString()}`);
  return { title, lines, meta: 'GSP Tracker v1.2' };
}
