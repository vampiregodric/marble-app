// Envio de email pelo Resend (https://resend.com/docs/api-reference/emails/send-email).
// Sem SDK: um POST HTTPS com o Node 22. A API key vive no Secret Manager
// (RESEND_API_KEY) e só é declarada com QUOTE_EMAIL=on em functions/.env;
// o domínio marble.pt tem de estar verificado no Resend (registos DNS) para
// o remetente `app@marble.pt` ser aceite. Decisões do Fábio (2026-09-04):
// Resend, remetente app@marble.pt, cópia da equipa para quotes@marble.pt.

const SEND_URL = 'https://api.resend.com/emails';

export type EmailConfig = {
  apiKey: string;
  // "Marble Studios <app@marble.pt>"
  from: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

// Devolve o id do email no Resend. Lança em caso de erro HTTP — quem chama
// regista o erro no doc (emailError) e não repete sozinho.
export async function sendEmail(cfg: EmailConfig, msg: EmailMessage): Promise<string> {
  const body: Record<string, unknown> = {
    from: cfg.from,
    to: [msg.to],
    subject: msg.subject,
    text: msg.text,
  };
  if (msg.html) body.html = msg.html;
  if (msg.replyTo) body.reply_to = msg.replyTo;
  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { id?: string };
  return data.id ?? '';
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Texto simples → HTML mínimo (parágrafos e quebras de linha), no tom
// sóbrio da marca: sem imagens nem layouts, para chegar bem em todo o lado.
export function textToHtml(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Manrope,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a">${paragraphs}</div>`;
}
