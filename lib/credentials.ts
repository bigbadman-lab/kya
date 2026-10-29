export const PUBLIC_ID = /^kya_[0-9a-hjkmnp-tv-z]{26}$/;
export const MANAGEMENT_TOKEN = /^kya_mgmt_[0-9a-hjkmnp-tv-z]{52}$/;
export const CREDENTIAL_PREFIX = /^kya_mgmt_[0-9a-hjkmnp-tv-z]{8}$/;
export const CHALLENGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CHALLENGE_TOKEN = /^kya_chal_[0-9a-hjkmnp-tv-z]{26}$/;

export function isPublicId(value: string): boolean {
  return PUBLIC_ID.test(value);
}

export function isManagementToken(value: string): boolean {
  return MANAGEMENT_TOKEN.test(value);
}

export function bearerManagementToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match || !isManagementToken(match[1])) return null;
  return match[1];
}
