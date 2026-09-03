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

## Nomes das secções e das conversas

- Refere as secções do `ROADMAP.md` **sempre pelo nome completo**, copiado
  do cabeçalho: "Secção 1 — Firebase & modelo de dados". Nunca só "Secção 1".
- Ao começar uma conversa dedicada a uma secção, define **logo no início** o
  título da sessão (ferramenta `set_session_title`, `session_id: "self"`)
  como `Marble Studios — Secção N — Nome da secção`, para ser identificável
  na barra lateral quando houver várias secções em curso.

## Outras

- No fim da tua secção, atualiza o estado dela no `ROADMAP.md` e faz commit
  com uma mensagem clara do que ficou feito. Depois **pede ao Fábio para
  correr `git push`** — o repositório está no GitHub (ver `DEVELOPMENT.md`),
  mas o Claude Code em modo automático não pode publicar para fora do PC.
  Se o push falhar ou for esquecido, o trabalho fica só neste disco.
- O projeto vive fora do OneDrive de propósito (ver `DEVELOPMENT.md`) —
  nunca o movas de volta para lá.
