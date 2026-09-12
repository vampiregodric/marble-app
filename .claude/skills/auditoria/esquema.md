# Esquema dos achados e dos relatórios

Formato obrigatório. A consolidação (junta os relatórios dos agentes), a
página privada (`scripts/build-audit.mjs`) e a reverificação nas corridas
seguintes dependem de cada campo estar exatamente assim.

## Um achado

```
### SEG-A-03 — Cliente apaga ficheiros de outros no Cloudinary
- **Vertente:** seguranca
- **Severidade:** Crítico
- **Superfície:** functions
- **Onde:** `functions/src/simulations.ts:212`, `firestore.rules:216`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** uma a três frases, sem rodeios.
- **Cenário de falha:** entrada ou estado concreto → o que acontece.
- **Evidência:** excerto de código de até 8 linhas, ou comando + resultado.
- **Correção proposta:** o que mudar; esboço de código se Crítico ou Alto.
- **Esforço:** S
- **Também:** QUA-07 (só na consolidação, quando funde duplicados)
```

Regras dos campos:

- **ID:** prefixo da vertente (`SEG-A`, `SEG-B`, `QUA`, `DES`, `DEP`,
  `TES`, `ARQ`, `RGPD`) + número sequencial com dois dígitos. Os IDs não
  mudam na consolidação — servem para voltar ao relatório do agente e para
  a reverificação.
- **Título:** curto, concreto, com o efeito ("Cliente apaga…", "Query sem
  limite em…"), não a categoria ("Problema de segurança").
- **Vertente:** `seguranca | qualidade | desempenho | dependencias | testes
  | arquitetura | rgpd`.
- **Superfície:** `regras | functions | app | backoffice | scripts |
  hosting | dependencias`.
- **Onde:** caminhos relativos à pasta da app; backoffice como
  `../marble-backoffice/src/...`. Sempre com linha. Vários, separados por
  vírgula.
- **Confiança:** `confirmado` (leste o código e o cenário verifica-se) ou
  `provável` (precisa de teste ou de dados que não tens). Nunca inventes
  linhas nem comportamentos: se não confirmaste, é `provável` e dizes o
  que faltou.
- **Estado:** `aberto` num achado novo. Mais tarde: `corrigido (commit)`,
  `aceite (motivo, data)`, `descartado (motivo)`.
- **Evidência:** obrigatória. Sem evidência não há achado.
- **Esforço:** `S` (menos de uma hora), `M` (meio dia), `L` (mais de um
  dia ou depende de terceiros — contas, aprovações, builds nativas).

## Severidade (rubrica comum a todas as vertentes)

| Severidade | Quando |
|---|---|
| Crítico | Dados de um cliente legíveis ou alteráveis por outro; segredo exposto; tratamento de dados pessoais sem base legal ou sem estar na política; algo que parte a produção ou custa dinheiro sem tecto. |
| Alto | Abuso em escala (spam, custo, apagar ficheiros alheios); perda de integridade dos dados; falha num caminho comum da app ou do backoffice; vulnerabilidade de dependência alcançável neste runtime; promessa legal não cumprida (retenção, apagar conta). |
| Médio | Defeito num caminho menos comum; dívida que vai custar em breve (duplicação que já divergiu, sem testes no que mais arrisca); desempenho no caminho quente mas com limite conhecido. |
| Baixo | Acabamento, consistência, pequenas ineficiências. |
| Sugestão | Melhoria que vale a pena mas não é defeito. |

Cada vertente afina a rubrica no seu ficheiro; em caso de dúvida, esta
tabela manda. Não infles severidades para dar peso ao relatório: um
relatório com dois Críticos verdadeiros vale mais do que dez inflacionados.

## Relatório de uma vertente (o que cada agente escreve)

```
# Auditoria AAAA-MM-DD — <vertente>[ — parte A]

## Âmbito
Pastas e ficheiros lidos (contagem), o que ficou de fora e porquê, comandos
corridos (só leitura) e o resultado em uma linha cada.

## Contagem
| Severidade | Achados |
|---|---|
| Crítico | 0 |
| Alto | 0 |
| Médio | 0 |
| Baixo | 0 |
| Sugestão | 0 |

## Achados
Por severidade decrescente, no formato acima.

## O que está bem
Lista curta e concreta (com ficheiro) do que foi verificado e está certo —
serve para a corrida seguinte não repetir trabalho e para o Fábio saber o
que já não precisa de olhar.

## Não verificado
O que a metodologia pedia e não foi possível (sem acesso, sem dados, sem
tempo), com o motivo.

## Reverificação (só nos modos desde e verificar)
| ID | Estado anterior | Estado agora | Evidência |
```

## Relatório consolidado (o que o orquestrador escreve em `auditorias/AAAA-MM-DD.md`)

```
---
data: AAAA-MM-DD
modo: completo | desde | verificar
app_commit: <sha curto>
backoffice_commit: <sha curto ou "ausente">
vertentes: [seguranca, qualidade, desempenho, dependencias, testes, arquitetura, rgpd]
agentes: 8
pagina: <url da página privada, ou vazio>
---

# Auditoria AAAA-MM-DD

## Resumo executivo
Cinco linhas no máximo: o estado geral, os dois ou três riscos que mandam,
o que está bem. Depois a tabela severidade × vertente.

| Vertente | Crítico | Alto | Médio | Baixo | Sugestão |
|---|---|---|---|---|---|

## Pacotes de correção
### Pacote 1 — <nome>
- **Objetivo:** …
- **Achados:** SEG-A-03, SEG-B-01
- **Feito quando:** … (teste, regra, comportamento observável)
- **Esforço:** M
- **Botão:** criado | não criado (motivo)

## Achados
Por severidade decrescente, depois por superfície. Formato de um achado
para Crítico, Alto e Médio; Baixo e Sugestão numa tabela (ID | título |
superfície | onde | correção | esforço) — o detalhe fica no relatório da
vertente em `auditorias/AAAA-MM-DD/`. Um achado encontrado pelo próprio
orquestrador na consolidação usa o prefixo da vertente com a letra `C`
(ex.: `SEG-C-01`) e diz na confiança como foi confirmado.

## Descartados na consolidação
ID — motivo (o orquestrador verificou e não se confirma).

## O que está bem
Fundido dos relatórios das vertentes, sem repetições.

## Não verificado
Fundido dos relatórios das vertentes.

## Estado dos achados anteriores (só desde/verificar)
| ID | Relatório | Estado anterior | Estado agora | Evidência |
```

O nome do ficheiro é a data (`2026-09-12.md`); uma segunda corrida no
mesmo dia é `2026-09-12-2.md`. O gerador da página pega no mais recente.
