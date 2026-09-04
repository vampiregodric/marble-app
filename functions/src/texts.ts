import { CATEGORY_NAME, CheckupRequest, Client, MarbleEvent, Vehicle, Work } from './types';

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

function firstName(c: Client): string {
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

  retentionWarning(deleteOn: Date) {
    return {
      title: 'A tua conta vai ser apagada',
      description: `Não usas a app da Marble Studios há quase 3 anos. Abre-a até ${formatDay(deleteOn)} para a manter — caso contrário apagamos a conta e os teus dados, como diz a política de privacidade.`,
    };
  },
};
