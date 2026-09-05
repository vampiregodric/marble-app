#!/usr/bin/env node
// Faz o papel da EQUIPA no agendamento de checkups (Secção 8) a partir da
// linha de comandos, com o Admin SDK — até a página "Checkups" do backoffice
// existir (Secção 7b). Serve para testar o fluxo de ponta a ponta: o cliente
// pede na app, a equipa aprova ou propõe outro dia aqui, a Cloud Function
// avisa o cliente (alerta + push). Escreve a sério no Firestore de DEV;
// recusa chaves do prod.
//
// Uso (a partir da raiz do projeto):
//   node scripts/checkup-admin.mjs <chave.json> list                                   # carros/chãos com checkup por fazer e o estado do pedido
//   node scripts/checkup-admin.mjs <chave.json> show <vehicleId>
//   node scripts/checkup-admin.mjs <chave.json> approve <vehicleId> [--time 10:30] [--note "texto"]
//   node scripts/checkup-admin.mjs <chave.json> propose <vehicleId> --day 2026-09-09 --period morning|afternoon [--time 15:00] [--note "texto"]
//   node scripts/checkup-admin.mjs <chave.json> done <vehicleId>                       # "Marcar em dia" (checkupStatus ok + checkupDoneAt)
//   node scripts/checkup-admin.mjs <chave.json> reset <vehicleId>                      # tira o pedido e volta a 'pending' (para testar outra vez)
//   node scripts/checkup-admin.mjs <chave.json> availability                           # mostra settings/checkups
//   node scripts/checkup-admin.mjs <chave.json> availability --weekly "mon:morning,afternoon;tue:morning;sat:morning" [--closed 2026-09-15,2026-09-16] [--weeks 3] [--min 1]
//
// Ou pelo npm: npm run checkup:admin -- ./serviceAccountKey.dev.json list

import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const [keyPath, command, vehicleId] = positional;

if (!keyPath || !command) {
  console.error('Uso: node scripts/checkup-admin.mjs <chave.json> list|show|approve|propose|done|reset|availability [vehicleId] [--day] [--period] [--time] [--note] [--weekly] [--closed] [--weeks] [--min]');
  process.exit(1);
}
const key = JSON.parse(readFileSync(keyPath, 'utf8'));
if (!String(key.project_id).endsWith('-dev')) {
  console.error(`Recusado: a chave é de ${key.project_id}; isto é só para o projeto de desenvolvimento.`);
  process.exit(1);
}
initializeApp({ credential: cert(key) });
const db = getFirestore();

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const PERIODS = ['morning', 'afternoon'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function slot(req) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(req.day ?? '');
  const day = m ? `${WEEKDAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]}, ${+m[3]} ${MONTHS[+m[2] - 1]}` : req.day;
  return req.time ? `${day} às ${req.time}` : `${day}, ${req.period === 'morning' ? 'de manhã' : 'à tarde'}`;
}

async function loadVehicle(id) {
  if (!id) throw new Error('Falta o vehicleId.');
  const snap = await db.collection('vehicles').doc(id).get();
  if (!snap.exists) throw new Error(`vehicles/${id} não existe.`);
  return { id: snap.id, ...snap.data() };
}

async function clientName(clientId) {
  const c = await db.collection('clients').doc(clientId).get();
  const d = c.data();
  return d ? `${d.name || d.email || clientId}${d.phone ? ` · ${d.phone}` : ''}` : clientId;
}

function describe(v) {
  const r = v.checkupRequest;
  const req = r ? `pedido ${r.status} → ${slot(r)}${r.note ? ` · nota: "${r.note}"` : ''}${r.teamNote ? ` · equipa: "${r.teamNote}"` : ''}` : 'sem pedido';
  return `${v.id} · ${v.name} [${v.checkupStatus}] · ${req}`;
}

function requireRequest(v, allowed) {
  const r = v.checkupRequest;
  if (!r) throw new Error(`${v.name}: não tem pedido de checkup (o cliente ainda não pediu na app).`);
  if (!allowed.includes(r.status)) throw new Error(`${v.name}: o pedido está "${r.status}" — só se pode fazer isto com ${allowed.join('/')}.`);
  return r;
}

function validTime(t) {
  if (t === undefined) return undefined;
  if (!/^\d{2}:\d{2}$/.test(t)) throw new Error('--time tem de ser HH:MM (ex: 10:30).');
  return t;
}

async function main() {
  switch (command) {
    case 'list': {
      const snap = await db.collection('vehicles').where('checkupStatus', 'in', ['pending', 'declined']).get();
      if (snap.empty) console.log('Nenhum carro/chão com checkup por fazer.');
      for (const d of snap.docs) {
        const v = { id: d.id, ...d.data() };
        console.log(`${describe(v)} · cliente: ${await clientName(v.clientId)}`);
      }
      return;
    }
    case 'show': {
      const v = await loadVehicle(vehicleId);
      console.log(`${describe(v)} · cliente: ${await clientName(v.clientId)}`);
      return;
    }
    case 'approve': {
      const v = await loadVehicle(vehicleId);
      const r = requireRequest(v, ['pending', 'proposed']);
      const patch = { 'checkupRequest.status': 'approved', 'checkupRequest.decidedAt': Timestamp.now(), updatedAt: Timestamp.now() };
      const time = validTime(flag('time'));
      if (time) patch['checkupRequest.time'] = time;
      if (flag('note') !== undefined) patch['checkupRequest.teamNote'] = flag('note');
      await db.collection('vehicles').doc(v.id).update(patch);
      console.log(`Aprovado: ${v.name} → ${slot({ ...r, time: time ?? r.time })}. A Function envia "Checkup agendado" ao cliente.`);
      return;
    }
    case 'propose': {
      const v = await loadVehicle(vehicleId);
      requireRequest(v, ['pending', 'approved']);
      const day = flag('day');
      const period = flag('period');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) throw new Error('--day tem de ser AAAA-MM-DD.');
      if (!PERIODS.includes(period)) throw new Error('--period tem de ser morning ou afternoon.');
      const time = validTime(flag('time'));
      const patch = {
        'checkupRequest.status': 'proposed',
        'checkupRequest.day': day,
        'checkupRequest.period': period,
        'checkupRequest.time': time ?? FieldValue.delete(),
        'checkupRequest.teamNote': flag('note') ?? FieldValue.delete(),
        'checkupRequest.decidedAt': Timestamp.now(),
        'checkupRequest.confirmedAt': FieldValue.delete(),
        updatedAt: Timestamp.now(),
      };
      await db.collection('vehicles').doc(v.id).update(patch);
      console.log(`Proposta: ${v.name} → ${slot({ day, period, time })}. A Function envia a proposta ao cliente; ele confirma na app.`);
      return;
    }
    case 'done': {
      const v = await loadVehicle(vehicleId);
      await db.collection('vehicles').doc(v.id).update({ checkupStatus: 'ok', checkupDoneAt: Timestamp.now(), updatedAt: Timestamp.now() });
      console.log(`${v.name}: marcado em dia (checkupDoneAt agora). O cartão desaparece do Perfil.`);
      return;
    }
    case 'reset': {
      const v = await loadVehicle(vehicleId);
      await db.collection('vehicles').doc(v.id).update({
        checkupStatus: 'pending',
        checkupRequest: FieldValue.delete(),
        checkupRequestedAt: FieldValue.delete(),
        checkupDoneAt: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });
      console.log(`${v.name}: sem pedido, checkup pendente outra vez. O Perfil volta a mostrar "Agendar agora".`);
      return;
    }
    case 'availability': {
      const ref = db.collection('settings').doc('checkups');
      const weekly = flag('weekly');
      const closed = flag('closed');
      const weeks = flag('weeks');
      const min = flag('min');
      if (weekly !== undefined || closed !== undefined || weeks !== undefined || min !== undefined) {
        const patch = { updatedAt: Timestamp.now() };
        if (weekly !== undefined) {
          const map = {};
          for (const part of weekly.split(';').filter(Boolean)) {
            const [wd, ps = ''] = part.split(':');
            if (!WEEKDAY_KEYS.includes(wd)) throw new Error(`Dia da semana inválido em --weekly: "${wd}" (usa ${WEEKDAY_KEYS.join(', ')}).`);
            const periods = ps.split(',').filter(Boolean);
            for (const p of periods) if (!PERIODS.includes(p)) throw new Error(`Período inválido em --weekly: "${p}".`);
            map[wd] = periods;
          }
          patch.weekly = map;
        }
        if (closed !== undefined) patch.closedDays = closed.split(',').filter(Boolean);
        if (weeks !== undefined) patch.weeksAhead = Number(weeks);
        if (min !== undefined) patch.minDaysAhead = Number(min);
        await ref.set(patch, { merge: true });
        console.log('settings/checkups atualizado.');
      }
      const snap = await ref.get();
      if (!snap.exists) {
        console.log('settings/checkups não existe — a app usa o plano por defeito (seg–sex, manhã e tarde, 3 semanas, a partir de amanhã). Corre o seed ou define aqui com --weekly.');
        return;
      }
      const a = snap.data();
      for (const wd of WEEKDAY_KEYS) {
        const ps = a.weekly?.[wd] ?? [];
        console.log(`  ${wd}: ${ps.length ? ps.map((p) => (p === 'morning' ? 'manhã' : 'tarde')).join(' + ') : 'fechado'}`);
      }
      console.log(`  dias fechados: ${a.closedDays?.length ? a.closedDays.join(', ') : 'nenhum'} · semanas à frente: ${a.weeksAhead ?? 3} · antecedência mínima: ${a.minDaysAhead ?? 1} dia(s)`);
      return;
    }
    default:
      throw new Error(`Comando desconhecido: ${command}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
