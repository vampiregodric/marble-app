import { CATEGORY_NAME, Client, CONTACT_PREFERENCE_LABEL, DEPARTMENT_NAME, MarbleEvent, ServiceRequest, Vehicle, Work } from './types';
import { textToHtml } from './email';

// Prazo de resposta prometido nos pedidos de orçamento (o mesmo que a app
// mostra: REQUEST_RESPONSE_PROMISE em src/firebase/models.ts).
const RESPONSE_PROMISE = 'no prazo de 1 dia útil';

// Textos das notificações automáticas, em português, no tom da app. Tudo
// o que o cliente lê vive aqui, para mudar num sítio só. Os títulos são
// curtos (cabem na barra de notificações); a descrição é o texto do ecrã
// Alertas e do corpo do push.

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "12 set", "12 set, 10:00" — em hora de Lisboa, seja qual for o fuso da máquina.
export function formatDay(d: Date, withTime = false): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // Sem zero à esquerda no dia ("5 set", não "05 set").
  const day = `${Number(get('day'))} ${MONTHS[Number(get('month')) - 1]}`;
  return withTime ? `${day}, ${get('hour')}:${get('minute')}` : day;
}

function vehicleWord(v: Vehicle): string {
  return v.type === 'floor' ? 'chão' : 'carro';
}

function firstName(c: Client | { name: string }): string {
  return (c.name || '').trim().split(/\s+/)[0] || 'Cliente';
}

// "PPF, Detailing · BMW M4 2022" — o resumo de um pedido numa linha.
function requestSummary(r: ServiceRequest): string {
  const parts = [r.services.join(', '), ...r.fields.map((f) => f.value)].filter(Boolean);
  return parts.join(' · ') || r.message.trim().slice(0, 80);
}

function requestKind(r: ServiceRequest): string {
  return r.type === 'checkup' ? 'pedido de checkup' : 'pedido de orçamento';
}

export const TEXTS = {
  checkupReminder(work: Work, vehicle: Vehicle) {
    return {
      title: `Checkup gratuito do teu ${vehicleWord(vehicle)}`,
      description: `Já podes fazer o checkup gratuito do teu ${vehicle.name} (${work.title}). Confirma na app ou liga-nos para marcar.`,
    };
  },
  teamAlertNoAccount(client: Client, work: Work, vehicle: Vehicle) {
    return {
      title: `Ligar a ${client.name || 'cliente sem nome'}: checkup do ${vehicle.name}`,
      description: `Cliente sem conta na app — não recebe lembretes. Marcar o checkup de "${work.title}" por telefone${client.phone ? `: ${client.phone}` : ' (sem telemóvel na ficha)'}.`,
    };
  },
  teamAlertNoConfirmation(client: Client, work: Work, vehicle: Vehicle, daysSinceReminder: number) {
    return {
      title: `${client.name || 'Cliente'} não confirmou o checkup`,
      description: `${vehicle.name} (${work.title}) · lembrete enviado há ${daysSinceReminder} ${daysSinceReminder === 1 ? 'dia' : 'dias'}, sem resposta. Ligar${client.phone ? `: ${client.phone}` : ' (sem telemóvel na ficha)'}.`,
    };
  },
  offerFreeWash(client: Client, work: Work, vehicle: Vehicle) {
    return {
      title: `Lavagem grátis para o teu ${vehicle.name}`,
      description: `${firstName(client)}, obrigado pela confiança em "${work.title}". Tens uma lavagem grátis à espera — passa pela Marble Studios quando quiseres.`,
    };
  },
  newWork(work: Work) {
    const detail = work.model?.trim() || work.description.trim().slice(0, 100);
    return {
      title: `Novo trabalho: ${work.title}`,
      description: `${CATEGORY_NAME[work.category] ?? work.category}${detail ? ` · ${detail}` : ''}. Vê as fotos no Portfólio.`,
    };
  },
  eventReminder(event: MarbleEvent) {
    return {
      title: `Amanhã: ${event.title}`,
      description: `${event.location} · ${formatDay(event.date.toDate(), true)}. Vem ter connosco.`,
    };
  },
  // Alerta interno no Painel do backoffice.
  requestTeamAlert(r: ServiceRequest) {
    const what = requestSummary(r);
    return {
      title: `Novo ${requestKind(r)}: ${DEPARTMENT_NAME[r.department] ?? r.department}`,
      description: `${r.name || 'Cliente'} · ${r.phone || 'sem telemóvel'} (${CONTACT_PREFERENCE_LABEL[r.contactPreference] ?? r.contactPreference})${what ? ` · ${what}` : ''}${r.workTitle ? ` · semelhante a "${r.workTitle}"` : ''}. Ver em Pedidos.`,
    };
  },
  // Alerta operacional ao cliente (ecrã Alertas + push).
  requestConfirmation(r: ServiceRequest) {
    return {
      title: 'Recebemos o teu pedido',
      description: `${firstName(r)}, obrigado pelo ${requestKind(r)} (${DEPARTMENT_NAME[r.department] ?? r.department}). A equipa da Marble Studios responde ${RESPONSE_PROMISE}, por ${CONTACT_PREFERENCE_LABEL[r.contactPreference] ?? r.contactPreference}.`,
    };
  },
  // Email à equipa (quotes@marble.pt) com tudo o que o cliente escreveu.
  requestTeamEmail(r: ServiceRequest, backofficeUrl: string) {
    const dept = DEPARTMENT_NAME[r.department] ?? r.department;
    const lines = [
      `Novo ${requestKind(r)} — ${dept}`,
      '',
      `Cliente: ${r.name || '—'}`,
      `Telemóvel: ${r.phone || '—'}`,
      `Email: ${r.email || '—'}`,
      `Contactar por: ${CONTACT_PREFERENCE_LABEL[r.contactPreference] ?? r.contactPreference}`,
      r.workTitle ? `Orçamento semelhante a: ${r.workTitle}` : '',
      '',
      r.services.length ? `Pretende: ${r.services.join(', ')}` : '',
      ...r.fields.map((f) => `${f.label}: ${f.value}`),
      '',
      'Mensagem:',
      r.message.trim() || '—',
      '',
      r.photos?.length ? `Fotos (${r.photos.length}):\n${r.photos.map((p) => p.url).join('\n')}` : '',
      '',
      `Ver no backoffice: ${backofficeUrl}`,
      r.platform ? `Enviado pela app (${r.platform}) a ${formatDay(r.createdAt.toDate(), true)}.` : '',
    ].filter((l) => l !== undefined);
    const text = lines.join('\n').replace(/\n{3,}/g, '\n\n');
    return { subject: `[Pedido] ${dept} — ${r.name || 'cliente'}`, text, html: textToHtml(text) };
  },
  // Email de confirmação ao cliente.
  requestClientEmail(r: ServiceRequest) {
    const dept = DEPARTMENT_NAME[r.department] ?? r.department;
    const text = [
      `Olá ${firstName(r)},`,
      '',
      `Recebemos o teu ${requestKind(r)} (${dept}). A equipa da Marble Studios responde ${RESPONSE_PROMISE}, por ${CONTACT_PREFERENCE_LABEL[r.contactPreference] ?? r.contactPreference}.`,
      '',
      r.services.length ? `Pediste: ${r.services.join(', ')}.` : '',
      '',
      'Se quiseres acrescentar alguma coisa, responde a este email.',
      '',
      'Marble Studios',
    ].join('\n');
    return { subject: 'Recebemos o teu pedido — Marble Studios', text, html: textToHtml(text) };
  },
  retentionWarning(deleteOn: Date) {
    return {
      title: 'A tua conta vai ser apagada',
      description: `Não usas a app da Marble Studios há quase 3 anos. Abre-a até ${formatDay(deleteOn)} para a manter — caso contrário apagamos a conta e os teus dados, como diz a política de privacidade.`,
    };
  },
};
