/**
 * Confluence REST auth.
 * - Atlassian Cloud: CONFLUENCE_EMAIL + CONFLUENCE_PAT → Basic (email:api_token).
 * - Bearer: PAT only, or CONFLUENCE_USE_BEARER=1 when email is set but Basic must not be used.
 * - wiki.ringcentral.com disables Basic; we default to Bearer unless CONFLUENCE_USE_BASIC=1.
 */
export function confluenceAuthHeaders() {
  const pat =
    process.env.CONFLUENCE_PAT ||
    process.env.ATLASSIAN_API_TOKEN ||
    process.env.Wiki_PAT ||
    '';
  const email = process.env.CONFLUENCE_EMAIL || process.env.ATLASSIAN_USER_EMAIL || '';
  const base = (
    process.env.CONFLUENCE_BASE_URL ||
    process.env.CONFLUENCE_URL ||
    process.env.ATLASSIAN_SITE_URL ||
    ''
  ).toLowerCase();
  const rcWikiNoBasic =
    base.includes('wiki.ringcentral.com') &&
    process.env.CONFLUENCE_USE_BASIC !== '1' &&
    process.env.CONFLUENCE_USE_BASIC !== 'true';
  const forceBearer =
    process.env.CONFLUENCE_USE_BEARER === '1' ||
    process.env.CONFLUENCE_USE_BEARER === 'true' ||
    rcWikiNoBasic;

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
