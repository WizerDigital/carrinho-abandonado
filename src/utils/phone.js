export function cleanPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  return cleaned;
}

export function sanitizePhoneForWaha(phone) {
  if (!phone) return null;
  let cleaned = cleanPhone(phone);
  
  if (cleaned.length === 10 || cleaned.length === 11) {
    return '55' + cleaned;
  }
  
  if ((cleaned.length === 12 || cleaned.length === 13) && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  if (cleaned.length >= 10) {
    return cleaned;
  }
  
  return null;
}

export function formatToWaha(phone) {
  const cleaned = cleanPhone(phone);
  if (!cleaned.endsWith('@c.us') && !cleaned.endsWith('@s.whatsapp.net')) {
    return `${cleaned}@c.us`;
  }
  return cleaned;
}
