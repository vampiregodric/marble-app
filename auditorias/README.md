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

(ainda não publicada — a primeira corrida escreve aqui o link)

## Corridas

| Data | Modo | Crítico | Alto | Médio | Baixo | Sugestão | Pacotes | Relatório |
|---|---|---|---|---|---|---|---|---|
