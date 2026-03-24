/**
 * Confluence REST auth.
 * - Atlassian Cloud: set CONFLUENCE_EMAIL + CONFLUENCE_PAT (API token) → Basic (recommended).
 * - Bearer: CONFLUENCE_PAT only, or CONFLUENCE_USE_BEARER=1 to force Bearer when email is set.
 */
export function confluenceAuthHeaders() {
  const pat = process.env.CONFLUENCE_PAT || process.env.ATLASSIAN_API_TOKEN || '';
  const email = process.env.CONFLUENCE_EMAIL || process.env.ATLASSIAN_USER_EMAIL || '';
  const forceBearer = process.env.CONFLUENCE_USE_BEARER === '1' || process.env.CONFLUENCE_USE_BEARER === 'true';

  if (!pat) {
    throw new Error('CONFLUENCE_PAT (or ATLASSIAN_API_TOKEN) is required');
  }

  if (email && !forceBearer) {
    const basic = Buffer.from(`${email}:${pat}`, 'utf8').toString('base64');
    return {
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
    };
  }

  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/json',
  };
}
