# Auditorias

Relatórios da auditoria dinâmica do projeto (app, Cloud Functions, regras
Firestore, scripts e backoffice) em sete vertentes: segurança, qualidade,
desempenho, dependências, testes, arquitetura e RGPD.

- **Correr:** numa conversa do Claude na pasta da app, `/auditoria`
  (modo `desde` quando já há relatórios — só o que mudou e os achados
  abertos; `/auditoria completo` para tudo; `/auditoria verificar` só
  reverifica). A skill está em `.claude/skills/auditoria/` e vai pelo git
  para os dois PCs.
- **Formato:** `AAAA-MM-DD.md`, um por corrida, com cabeçalho YAML (é dele
  que a corrida seguinte lê os commits auditados). Esquema dos achados em
  `.claude/skills/auditoria/esquema.md`.
- **Página privada:** `npm run auditoria:pagina` gera
  `scripts/out/auditoria.html` (não vai para o git) a partir do relatório
  mais recente; publica-se como Artifact no link abaixo.
- **Esta pasta não é publicada:** o Hosting serve `docs/`, não `auditorias/`.
  Não mudes isso.
- **Estados dos achados:** `aberto`, `corrigido (commit)`, `aceite (motivo,
  data)` — só o Fábio aceita —, `descartado (motivo)`. As conversas de
  correção (os botões "Auditoria AAAA-MM-DD — Pacote N") atualizam o
  estado no próprio relatório.

## Página privada

https://claude.ai/code/artifact/7c8e78ec-5e37-4d1c-889a-0bd3ad21aa6d — mostra
sempre o relatório mais recente. Para republicar: `npm run auditoria:pagina`
e a ferramenta `Artifact` com `action: "read"` neste link e depois publicar
`scripts/out/auditoria.html` com `url` = este link (sem `url` cria-se uma
página nova — errado).

## Corridas

| Data | Modo | Crítico | Alto | Médio | Baixo | Sugestão | Pacotes | Relatório |
|---|---|---|---|---|---|---|---|---|
| 2026-09-12 | completo (8 agentes; app `691938a`, backoffice `1c532f2`) | 0 | 19 | 45 | 23 | 16 | 12 (botões) | [2026-09-12.md](2026-09-12.md) · por vertente em [2026-09-12/](2026-09-12/) |
