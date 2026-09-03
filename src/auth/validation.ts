// Validação simples no cliente, antes de bater no Firebase. O Firebase valida
// outra vez do lado dele — isto serve só para dar feedback imediato.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Escreve o teu email.';
  if (!EMAIL_RE.test(email.trim())) return 'Esse email não parece válido.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Escreve uma password.';
  if (password.length < 6) return 'A password tem de ter pelo menos 6 caracteres.';
  return undefined;
}

export function validateName(name: string): string | undefined {
  if (name.trim().length < 2) return 'Escreve o teu nome.';
  return undefined;
}

// Aceita "912 345 678", "+351 912345678", etc. — pede pelo menos 9 dígitos.
export function validatePhone(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Escreve o teu telemóvel — é como a equipa te contacta.';
  if (digits.length < 9) return 'Esse número parece curto demais.';
  return undefined;
}
