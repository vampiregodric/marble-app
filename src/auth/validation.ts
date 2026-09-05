import { S } from '../i18n';

// Validação simples no cliente, antes de bater no Firebase. O Firebase valida
// outra vez do lado dele — isto serve só para dar feedback imediato.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return S.validation.emailRequired;
  if (!EMAIL_RE.test(email.trim())) return S.validation.emailInvalid;
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return S.validation.passwordRequired;
  if (password.length < 6) return S.validation.passwordShort;
  return undefined;
}

export function validateName(name: string): string | undefined {
  if (name.trim().length < 2) return S.validation.nameRequired;
  return undefined;
}

// Aceita "912 345 678", "+351 912345678", etc. — pede pelo menos 9 dígitos.
export function validatePhone(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return S.validation.phoneRequired;
  if (digits.length < 9) return S.validation.phoneShort;
  return undefined;
}
