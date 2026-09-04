import { CATEGORY_NAME, CheckupRequest, Client, CONTACT_PREFERENCE_LABEL, DEPARTMENT_NAME, MarbleEvent, ServiceRequest, Vehicle, Work } from './types';
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

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// "seg, 7 set" a partir de "2026-09-07" (dia de calendário, sem fuso).
export function formatCheckupDay(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// "seg, 7 set, de manhã" ou, com hora da equipa, "seg, 7 set às 10:30".
export function formatCheckupSlot(req: Pick<CheckupRequest, 'day' | 'period' | 'time'>): string {
  const day = formatCheckupDay(req.day);
  if (req.time) return `${day} às ${req.time}`;
  return `${day}, ${req.period === 'morning' ? 'de manhã' : 'à tarde'}`;
}

function phoneText(c: Client): string {
  return c.phone ? `Telemóvel: ${c.phone}.` : 'Sem telemóvel na ficha.';
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
  // ---------- Agendamento de checkup (Secção 8) ----------

  // Alerta interno: o cliente pediu (ou alterou) o dia do checkup na app.
  // A equipa aprova ou propõe outro dia no backoffice (Secção 7b).
  checkupRequested(client: Client, vehicle: Vehicle, req: CheckupRequest, changed: boolean) {
    const note = req.note?.trim() ? ` Nota: "${req.note.trim()}".` : '';
    return {
      title: `${client.name || 'Cliente'} ${changed ? 'alterou o pedido de' : 'pediu'} checkup: ${vehicle.name}`,
      description: `Quer o checkup do ${vehicleWord(vehicle)} ${formatCheckupSlot({ day: req.day, period: req.period })}.${note} Aprovar ou propor outro dia no backoffice. ${phoneText(client)}`,
    };
  },
  // Alerta interno: o cliente confirmou o dia que a equipa propôs.
  checkupProposalConfirmed(client: Client, vehicle: Vehicle, req: CheckupRequest) {
    return {
      title: `${client.name || 'Cliente'} confirmou o checkup: ${vehicle.name}`,
      description: `Fica agendado para ${formatCheckupSlot(req)}. ${phoneText(client)}`,
    };
  },
  // Alerta interno: o cliente cancelou — decisão do Fábio: "considera que
  // não quis fazer", a equipa não insiste. Se já estava agendado, o dia fica livre.
  checkupCancelled(client: Client, vehicle: Vehicle, req: CheckupRequest, wasScheduled: boolean) {
    return {
      title: `${client.name || 'Cliente'} cancelou o checkup: ${vehicle.name}`,
      description: `${wasScheduled ? `Estava agendado para ${formatCheckupSlot(req)} — o dia fica livre.` : `Tinha pedido ${formatCheckupSlot({ day: req.day, period: req.period })}.`} O ${vehicleWord(vehicle)} sai dos checkups pendentes; não é preciso ligar.`,
    };
  },
  // Ao cliente: a equipa aprovou o pedido, ou ele confirmou a proposta.
  checkupScheduled(vehicle: Vehicle, req: CheckupRequest) {
    const note = req.teamNote?.trim() ? ` ${req.teamNote.trim()}` : '';
    return {
      title: `Checkup agendado: ${formatCheckupSlot(req)}`,
      description: `O checkup gratuito do teu ${vehicle.name} está marcado para ${formatCheckupSlot(req)}.${note} Se precisares de mudar, altera no Perfil.`,
    };
  },
  // Ao cliente: o dia pedido não dá; a equipa propõe outro.
  checkupProposed(vehicle: Vehicle, req: CheckupRequest) {
    const note = req.teamNote?.trim() ? ` ${req.teamNote.trim()}` : '';
    return {
      title: `Proposta de checkup: ${formatCheckupSlot(req)}`,
      description: `Para o teu ${vehicle.name}, a equipa propõe ${formatCheckupSlot(req)}.${note} Confirma no Perfil ou escolhe outro dia.`,
    };
  },

  // ---------- Pedidos de orçamento (Secção 7) ----------

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
