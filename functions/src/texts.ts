import { CATEGORY_NAME, Client, MarbleEvent, Vehicle, Work } from './types';

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
  retentionWarning(deleteOn: Date) {
    return {
      title: 'A tua conta vai ser apagada',
      description: `Não usas a app da Marble Studios há quase 3 anos. Abre-a até ${formatDay(deleteOn)} para a manter — caso contrário apagamos a conta e os teus dados, como diz a política de privacidade.`,
    };
  },
};
