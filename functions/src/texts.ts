import {
  CATEGORY_NAME,
  CheckupRequest,
  Client,
  CONTACT_PREFERENCE_LABEL,
  ContactPreference,
  DEPARTMENT_NAME,
  Locale,
  MarbleEvent,
  ServiceRequest,
  Vehicle,
  Work,
} from './types';
import { textToHtml } from './email';

// Textos das notificações automáticas, no tom da app. Tudo o que o cliente
// lê vive aqui, para mudar num sítio só. Os títulos são curtos (cabem na
// barra de notificações); a descrição é o texto do ecrã Alertas e do corpo
// do push.
//
// Idioma (Secção 12b, decisão do Fábio 2026-09-06): o que é dirigido ao
// CLIENTE sai em PT ou EN conforme `clients.locale` — gravado pela app pelo
// idioma do telemóvel; ausente = PT (contas anteriores à 12b, fichas criadas
// pela equipa). Cada função dirigida ao cliente recebe o `locale` em
// primeiro e tem as duas versões lado a lado, para não se esquecer uma ao
// mudar a outra. Os alertas internos (`team_alert`) e o email à equipa são
// sempre em PT. Os alertas manuais do backoffice não passam por aqui — a
// equipa escreve-os como quiser (a ficha do cliente mostra "EN").

export function clientLocale(c: Client | null | undefined): Locale {
  return c?.locale === 'en' ? 'en' : 'pt';
}

// Para alertas em lote (novo trabalho, evento): o texto nos dois idiomas,
// calculado uma vez, e depois `text[clientLocale(c)]` por cliente.
export function forLocales<T>(f: (locale: Locale) => T): Record<Locale, T> {
  return { pt: f('pt'), en: f('en') };
}

// Prazo de resposta prometido nos pedidos de orçamento (o mesmo que a app
// mostra: REQUEST_RESPONSE_PROMISE em src/firebase/models.ts e
// S.request.responsePromise em src/i18n).
const RESPONSE_PROMISE: Record<Locale, string> = {
  pt: 'no prazo de 1 dia útil',
  en: 'within 1 business day',
};

// As mesmas tabelas que a app (src/i18n/pt.ts e en.ts → `dates`): em PT o
// mês vai em minúsculas nos alertas ("7 set"); em EN "7 Sep".
const MONTHS: Record<Locale, string[]> = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const WEEKDAYS: Record<Locale, string[]> = {
  pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
// "por chamada" / "by phone call" — a meio da frase, por isso em minúsculas.
const CONTACT: Record<Locale, Record<ContactPreference, string>> = {
  pt: CONTACT_PREFERENCE_LABEL,
  en: { call: 'phone call', whatsapp: 'WhatsApp', email: 'email' },
};

function contactLabel(r: ServiceRequest, locale: Locale): string {
  return CONTACT[locale][r.contactPreference] ?? r.contactPreference;
}

// "12 set", "12 set, 10:00" / "12 Sep", "12 Sep, 10:00" — em hora de Lisboa,
// seja qual for o fuso da máquina.
export function formatDay(d: Date, locale: Locale = 'pt', withTime = false): string {
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
  const day = `${Number(get('day'))} ${MONTHS[locale][Number(get('month')) - 1]}`;
  return withTime ? `${day}, ${get('hour')}:${get('minute')}` : day;
}

function vehicleWord(v: Vehicle, locale: Locale = 'pt'): string {
  if (locale === 'en') return v.type === 'floor' ? 'floor' : 'car';
  return v.type === 'floor' ? 'chão' : 'carro';
}

// Primeiro nome, para tratar o cliente pelo nome; vazio quando não há nome.
function firstName(c: Client | { name: string }): string {
  return (c.name || '').trim().split(/\s+/)[0] || '';
}

// "Fábio, obrigado pela…" ou, sem nome, "Obrigado pela…".
function withName(name: string, sentence: string): string {
  return name ? `${name}, ${sentence}` : sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// "seg, 7 set" / "Mon, 7 Sep" a partir de "2026-09-07" (dia de calendário, sem fuso).
export function formatCheckupDay(day: string, locale: Locale = 'pt'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${WEEKDAYS[locale][d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[locale][d.getUTCMonth()]}`;
}

// "seg, 7 set, de manhã" ou, com hora da equipa, "seg, 7 set às 10:30"; em
// EN "Mon, 7 Sep, in the morning" / "Mon, 7 Sep at 10:30" — EXATAMENTE o
// que a app mostra (src/data/checkups.ts → formatCheckupSlot).
export function formatCheckupSlot(req: Pick<CheckupRequest, 'day' | 'period' | 'time'>, locale: Locale = 'pt'): string {
  const day = formatCheckupDay(req.day, locale);
  if (locale === 'en') {
    if (req.time) return `${day} at ${req.time}`;
    return `${day}, ${req.period === 'morning' ? 'in the morning' : 'in the afternoon'}`;
  }
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

export const TEXTS = {
  // ---------- Ao cliente (PT ou EN, por `locale`) ----------

  checkupReminder(locale: Locale, work: Work, vehicle: Vehicle) {
    if (locale === 'en') {
      return {
        title: `Free checkup for your ${vehicleWord(vehicle, 'en')}`,
        description: `It's time for the free checkup of your ${vehicle.name} (${work.title}). Pick a day in the app or call us to book.`,
      };
    }
    return {
      title: `Checkup gratuito do teu ${vehicleWord(vehicle)}`,
      description: `Já podes fazer o checkup gratuito do teu ${vehicle.name} (${work.title}). Confirma na app ou liga-nos para marcar.`,
    };
  },
  offerFreeWash(locale: Locale, client: Client, work: Work, vehicle: Vehicle) {
    const name = firstName(client);
    if (locale === 'en') {
      return {
        title: `Free wash for your ${vehicle.name}`,
        description: withName(name, `thank you for trusting us with "${work.title}". A free wash is waiting for you — drop by Marble Studios whenever you like.`),
      };
    }
    return {
      title: `Lavagem grátis para o teu ${vehicle.name}`,
      description: withName(name, `obrigado pela confiança em "${work.title}". Tens uma lavagem grátis à espera — passa pela Marble Studios quando quiseres.`),
    };
  },
  // O detalhe (modelo ou início da descrição) é o que a equipa escreveu no
  // backoffice — sai igual nos dois idiomas.
  newWork(locale: Locale, work: Work) {
    const detail = work.model?.trim() || work.description.trim().slice(0, 100);
    const what = `${CATEGORY_NAME[work.category] ?? work.category}${detail ? ` · ${detail}` : ''}`;
    if (locale === 'en') return { title: `New project: ${work.title}`, description: `${what}. See the photos in the Portfolio.` };
    return { title: `Novo trabalho: ${work.title}`, description: `${what}. Vê as fotos no Portfólio.` };
  },
  eventReminder(locale: Locale, event: MarbleEvent) {
    const when = `${event.location} · ${formatDay(event.date.toDate(), locale, true)}`;
    if (locale === 'en') return { title: `Tomorrow: ${event.title}`, description: `${when}. Come and see us.` };
    return { title: `Amanhã: ${event.title}`, description: `${when}. Vem ter connosco.` };
  },
  // A equipa aprovou o pedido, ou o cliente confirmou a proposta. A nota da
  // equipa só entra quando foi escrita ao aprovar — se o cliente confirmou
  // uma proposta, a nota era a pergunta da proposta e já foi lida. A nota
  // sai como a equipa a escreveu, seja qual for o idioma.
  checkupScheduled(locale: Locale, vehicle: Vehicle, req: CheckupRequest, withTeamNote = true) {
    const note = withTeamNote && req.teamNote?.trim() ? ` ${req.teamNote.trim()}` : '';
    const slot = formatCheckupSlot(req, locale);
    if (locale === 'en') {
      return {
        title: `Checkup scheduled: ${slot}`,
        description: `The free checkup of your ${vehicle.name} is booked for ${slot}.${note} If you need to change it, do it in your Profile.`,
      };
    }
    return {
      title: `Checkup agendado: ${slot}`,
      description: `O checkup gratuito do teu ${vehicle.name} está marcado para ${slot}.${note} Se precisares de mudar, altera no Perfil.`,
    };
  },
  // O dia pedido não dá; a equipa propõe outro.
  checkupProposed(locale: Locale, vehicle: Vehicle, req: CheckupRequest) {
    const note = req.teamNote?.trim() ? ` ${req.teamNote.trim()}` : '';
    const slot = formatCheckupSlot(req, locale);
    if (locale === 'en') {
      return {
        title: `Checkup proposal: ${slot}`,
        description: `For your ${vehicle.name}, the team proposes ${slot}.${note} Confirm in your Profile or pick another day.`,
      };
    }
    return {
      title: `Proposta de checkup: ${slot}`,
      description: `Para o teu ${vehicle.name}, a equipa propõe ${slot}.${note} Confirma no Perfil ou escolhe outro dia.`,
    };
  },
  // Alerta operacional ao cliente (ecrã Alertas + push) quando faz um
  // pedido de orçamento. Os nomes dos departamentos são marca, não se traduzem.
  requestConfirmation(locale: Locale, r: ServiceRequest) {
    const dept = DEPARTMENT_NAME[r.department] ?? r.department;
    const name = firstName(r);
    if (locale === 'en') {
      return {
        title: 'We got your request',
        description: withName(name, `thank you for your quote request (${dept}). The Marble Studios team replies ${RESPONSE_PROMISE.en}, by ${contactLabel(r, 'en')}.`),
      };
    }
    return {
      title: 'Recebemos o teu pedido',
      description: withName(name, `obrigado pelo pedido de orçamento (${dept}). A equipa da Marble Studios responde ${RESPONSE_PROMISE.pt}, por ${contactLabel(r, 'pt')}.`),
    };
  },
  // Email de confirmação ao cliente. Em EN não vai a linha das opções
  // escolhidas: guardam-se em PT (Secção 12) e sairiam misturadas — decisão
  // do Fábio (2026-09-06).
  requestClientEmail(locale: Locale, r: ServiceRequest) {
    const dept = DEPARTMENT_NAME[r.department] ?? r.department;
    const name = firstName(r);
    if (locale === 'en') {
      const text = [
        `Hi${name ? ` ${name}` : ''},`,
        '',
        `We got your quote request (${dept}). The Marble Studios team replies ${RESPONSE_PROMISE.en}, by ${contactLabel(r, 'en')}.`,
        '',
        'If you want to add anything, just reply to this email.',
        '',
        'Marble Studios',
      ].join('\n');
      return { subject: 'We got your request — Marble Studios', text, html: textToHtml(text) };
    }
    const text = [
      `Olá${name ? ` ${name}` : ''},`,
      '',
      `Recebemos o teu pedido de orçamento (${dept}). A equipa da Marble Studios responde ${RESPONSE_PROMISE.pt}, por ${contactLabel(r, 'pt')}.`,
      '',
      ...(r.services.length ? [`Pediste: ${r.services.join(', ')}.`, ''] : []),
      'Se quiseres acrescentar alguma coisa, responde a este email.',
      '',
      'Marble Studios',
    ].join('\n');
    return { subject: 'Recebemos o teu pedido — Marble Studios', text, html: textToHtml(text) };
  },
  retentionWarning(locale: Locale, deleteOn: Date) {
    if (locale === 'en') {
      return {
        title: 'Your account is about to be deleted',
        description: `You have not used the Marble Studios app in almost 3 years. Open it by ${formatDay(deleteOn, 'en')} to keep it — otherwise we delete the account and your data, as the privacy policy says.`,
      };
    }
    return {
      title: 'A tua conta vai ser apagada',
      description: `Não usas a app da Marble Studios há quase 3 anos. Abre-a até ${formatDay(deleteOn)} para a manter — caso contrário apagamos a conta e os teus dados, como diz a política de privacidade.`,
    };
  },

  // ---------- À equipa (sempre em PT): alertas internos e email ----------

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
  // Agendamento de checkup (Secção 8). Alerta interno: o cliente pediu (ou
  // alterou) o dia do checkup na app. A equipa aprova ou propõe outro dia
  // no backoffice (Secção 7b).
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
  // Pedidos de orçamento (Secção 7). Alerta interno no Painel do backoffice.
  requestTeamAlert(r: ServiceRequest) {
    const what = requestSummary(r);
    return {
      title: `Novo pedido de orçamento: ${DEPARTMENT_NAME[r.department] ?? r.department}`,
      description: `${r.name || 'Cliente'} · ${r.phone || 'sem telemóvel'} (${CONTACT_PREFERENCE_LABEL[r.contactPreference] ?? r.contactPreference})${what ? ` · ${what}` : ''}${r.workTitle ? ` · semelhante a "${r.workTitle}"` : ''}. Ver em Pedidos.`,
    };
  },
  // Email à equipa (quotes@marble.pt) com tudo o que o cliente escreveu.
  requestTeamEmail(r: ServiceRequest, backofficeUrl: string) {
    const dept = DEPARTMENT_NAME[r.department] ?? r.department;
    const lines = [
      `Novo pedido de orçamento — ${dept}`,
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
      r.platform ? `Enviado pela app (${r.platform}) a ${formatDay(r.createdAt.toDate(), 'pt', true)}.` : '',
    ].filter((l) => l !== undefined);
    const text = lines.join('\n').replace(/\n{3,}/g, '\n\n');
    return { subject: `[Pedido] ${dept} — ${r.name || 'cliente'}`, text, html: textToHtml(text) };
  },
};
