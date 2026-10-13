// Indian mobile numbers: 10 digits starting with 6-9. "+91 98765 43210" and "09876543210" are accepted.
export function normalizePhone(input = '') {
  let d = String(input).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}
export const isValidPhone = (d) => /^[6-9]\d{9}$/.test(d);
export const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;
