@AGENTS.md

# Regras para qualquer conversa neste projeto

Este é o projeto da app Marble Studios (React Native / Expo). O trabalho está
dividido em secções, cada uma feita numa conversa própria. Antes de tocar em
código, lê `SPEC.md` (requisitos), `DEVELOPMENT.md` (como correr, avisos) e
`ROADMAP.md` (a secção que vais atacar).

## Como trabalhar com o Fábio — regras dele, aplicam-se sempre

1. **Perguntar em escolha múltipla.** Sempre que a decisão for dele, usa
   `AskUserQuestion` com várias opções e a recomendada marcada. Depois de
   terminares um bloco de trabalho, propõe logo o próximo passo da mesma
   forma — não esperes que ele pergunte "e agora?".
2. **Validar cada pedido.** Parte do princípio de que consegues fazer melhor
   do que o pedido literal: se vires uma abordagem mais forte, propõe-na como
   alternativa em vez de construir exatamente o que foi descrito.
3. **Questionar o que ele está a esquecer.** Levanta proativamente requisitos,
   riscos ou passos em falta.
4. **Dar sugestões de melhoria**, mesmo sem ser pedido — mas só quando
   acrescentam valor real, não para segundo-adivinhar cada detalhe.
5. **Sem ícones decorativos na UI.** Um ícone só entra se transmitir
   informação (categoria, estado). Preferir sempre uma foto/miniatura real a
   um símbolo genérico — ele lê ícones de enfeite como "feito por IA".
6. **Não mudes um fluxo que está a funcionar sem perguntar.** Se um hábito já
   está estabelecido (como se abrem as secções novas, como se faz commit e
   push, como se perguntam as coisas), segue-o. Se achares que há uma forma
   melhor, propõe-na em escolha múltipla — nunca a troques por tua conta,
   nem anuncies "a partir de agora faço assim" sem ele decidir.
   (Dito por ele a 2026-09-07, depois de eu ter voltado a pedir-lhe para
   colar texto à mão quando as outras conversas já abriam a secção seguinte
   com um botão.)

## Como se abre a secção seguinte

Quando uma secção fica pronta a arrancar, **não** peças ao Fábio para colar
um prompt: usa a ferramenta `spawn_task` com o título
`Secção N — Nome da secção` e um prompt completo (caminho do projeto, ler
`ROADMAP.md` e atacar a secção pelo nome completo, regras acima, commit +
push no fim). Aparece-lhe um botão; um clique abre a conversa num worktree
próprio. É assim que as secções têm arrancado, cada uma no seu worktree.

## Nomes das secções e das conversas

- Refere as secções do `ROADMAP.md` **sempre pelo nome completo**, copiado
  do cabeçalho: "Secção 1 — Firebase & modelo de dados". Nunca só "Secção 1".
- Ao começar uma conversa dedicada a uma secção, define **logo no início** o
  título da sessão (ferramenta `set_session_title`, `session_id: "self"`)
  como `Marble Studios — Secção N — Nome da secção`, para ser identificável
  na barra lateral quando houver várias secções em curso.

## Outras

- No fim da tua secção, atualiza o estado dela no `ROADMAP.md`, faz commit
  com uma mensagem clara do que ficou feito, e corre **`git push`** — está
  autorizado nas definições do projeto (`.claude/settings.json`) e o GitHub
  é a única cópia fora deste PC (ver `DEVELOPMENT.md`). Se o push for
  bloqueado, pede ao Fábio para o correr; não deixes trabalho só no disco.
- O projeto vive fora do OneDrive de propósito (ver `DEVELOPMENT.md`) —
  nunca o movas de volta para lá.
