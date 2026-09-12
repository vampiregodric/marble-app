# Vertente: RGPD e dados pessoais

Objetivo: confrontar o que o código faz com os dados pessoais com o que a
política de privacidade e os termos prometem, e com o que o RGPD exige de
uma pequena empresa portuguesa: inventário, finalidade, base legal,
retenção, direitos, subcontratantes, transferências. Isto não é parecer
jurídico — é o levantamento técnico que um advogado ou o Fábio precisam
para decidir. Só leitura.

Âmbito: `src/` (o que se recolhe e mostra), `src/legal/texts.ts` e
`docs/legal/*.html` (o que se promete), `firestore.rules` (quem lê),
`functions/src/` (retenção, anonimização, envios a terceiros, logs),
`../marble-backoffice/src` (acesso da equipa, juntar fichas, exportações),
`docs/store/*.md` (formulários de privacidade das lojas), `SPEC.md`
(finalidades de negócio).

## Método

### 1. Inventário de dados pessoais

Tabela, uma linha por campo, a partir de `src/firebase/models.ts` e do
que as Functions acrescentam (`functions/src/types.ts`):

coleção.campo | categoria (identificação, contacto, veículo/matrícula,
imagem, localização, consentimento, técnico, comportamento) | quem
introduz (cliente / equipa / sistema) | finalidade | base legal provável
(contrato, consentimento, interesse legítimo, obrigação legal) | quem lê
(regras) | para onde vai (Cloudinary, Resend, Expo, Vertex AI, Cloud
Logging) | retenção implementada.

Não esquecer: fotos de clientes (perfil, pedidos, simulador — podem ter
caras, matrículas, interiores de casa), `pushTokens`, `lastActiveAt`,
`platform`, `locale`, notas internas da equipa (`clients.notes`), o texto
livre dos pedidos, o email da conta de demonstração das lojas.

### 2. O que se promete vs o que se faz

Lê `src/legal/texts.ts` (política e termos, PT e EN) e os HTML em
`docs/legal/`. Para cada promessa, encontra o código que a cumpre ou a
falta dele:

1. **Subcontratantes listados:** Firebase/Google, Cloudinary, Resend,
   Expo, Vertex AI (Google) — todos nomeados? Com finalidade?
2. **Transferências para fora da UE:** Firestore em `eur3` (UE); Cloud
   Functions em `europe-west1`; Cloudinary (onde guarda? a política diz?);
   Resend (região Irlanda, segundo `DEVELOPMENT.md`); Expo push (EUA);
   Vertex AI com `VERTEX_LOCATION=global` — a foto do cliente pode ser
   processada fora da UE: a política diz? Há cláusulas-tipo referidas?
3. **Prazos de retenção:** o que a política diz (fotos de perfil 30 dias
   depois de removidas, contas inativas, simulações 90 dias, pedidos…) e
   o que `functions/src/jobs/retention.ts`, `handlers.ts`, `requests.ts`,
   `simulations.ts` fazem — prazos iguais? Em dev `CLOUDINARY_CLEANUP=off`
   significa que ficheiros ficam para sempre: o dev tem dados reais?
4. **Direito ao apagamento:** `DeleteAccountScreen.tsx` +
   `handleClientUpdated` + regras (`delete: false`, anonimização). O que
   fica depois: `vehicles`, `requests`, `simulations`, `notifications`
   com `clientId` da conta apagada, fotos no Cloudinary, emails no Resend,
   logs. É "anonimizado" ou só "sem nome"? Reversível pela equipa?
5. **Direito de acesso e portabilidade:** existe alguma forma de o
   cliente obter os seus dados (ecrã, exportação no backoffice, processo
   manual documentado)? Se não, é achado.
6. **Consentimentos:** termos (`termsVersion`/`LEGAL_VERSION` — o que
   acontece quando a versão muda: volta a pedir?), marketing
   (`consent.marketing` — as notificações de marketing respeitam-no?
   `functions/src/notify.ts`, `push.ts`, tipos de alerta), simulador
   (`simulatorVersion` — uma vez por conta; o texto explica que a foto vai
   para um modelo de IA da Google?). Menores: alguma verificação de idade
   ou menção?
7. **Equipa:** o backoffice vê tudo, incluindo fotos do simulador
   (decisão do Fábio, 2026-09-09) — a política diz que a equipa vê as
   fotos? Há controlo de quem na equipa tem acesso (um claim para todos)?
8. **Logs:** `logger.info` com emails, nomes, telefones nas Functions —
   ficam 30 dias no Cloud Logging por omissão; a política cobre? Os
   scripts imprimem dados pessoais no terminal?
9. **Emails transacionais:** conteúdo (`functions/src/email.ts`,
   `texts.ts`) — vai o texto livre do pedido para `quotes@marble.pt`?
   Cópia ao cliente com os dados que ele deu? Cabeçalhos de
   desinscrição não se aplicam (transacional) — confirma que não há
   email de marketing.
10. **Lojas:** `docs/store/*.md` — o "Data safety" (Google Play) e as
    "Privacy nutrition labels" (Apple) que lá estão batem com o
    inventário do ponto 1? Cada categoria a mais ou a menos é achado (as
    lojas rejeitam ou, pior, aceitam e fica errado).

### 3. Minimização e segurança organizacional

- Campos que se recolhem sem finalidade clara (ex.: `platform`,
  `lastActiveAt` sem uso; telefone obrigatório?).
- Dados de produção em dev: o seed recusa o prod (bom); mas há contas
  reais no dev? Chaves de service account nos dois PCs — `DEVELOPMENT.md`
  fala em rodar as chaves antes do lançamento (checklist 6d): ainda por
  fazer?
- Registo de atividades de tratamento (art. 30.º): existe algum documento?
  Se não, propõe o mínimo a partir do inventário do ponto 1 (é a mesma
  tabela).

## Lista de verificação

1. Que dados pessoais existem, onde, e quem os vê?
2. Que subcontratante ou transferência falta na política?
3. Que prazo prometido não está implementado, ou está implementado
   diferente?
4. O que sobra depois de "apagar conta"?
5. Como é que um cliente obtém os seus dados hoje?
6. As fichas das lojas batem com o inventário?
7. Que consentimento é pedido, guardado e respeitado — e qual não é?

## Rubrica desta vertente

- **Crítico:** tratamento não coberto pela política (subcontratante ou
  transferência não declarados com dados pessoais reais, fotos incluídas);
  dado pessoal público sem base.
- **Alto:** promessa de retenção ou apagamento não cumprida; consentimento
  guardado mas não respeitado; ficha da loja errada.
- **Médio:** direito de acesso sem caminho; logs com dados pessoais;
  registo de tratamento inexistente; minimização.
- **Baixo / Sugestão:** redação da política, versões, avisos.

## Não é achado

- Não ter DPO (não é obrigatório a esta escala) — não menciones.
- Cookies: não há site com cookies próprios; regista só se o Hosting ou o
  backoffice os usarem.
- O backoffice ver os dados dos clientes — é a finalidade; o achado só
  existe se a política não o disser.

## Entrega

Relatório no formato de `esquema.md`, com o inventário (ponto 1) e a
tabela promessa vs código (ponto 2) em secções próprias antes de "O que
está bem". Diz explicitamente no topo que é um levantamento técnico, não
parecer jurídico.
