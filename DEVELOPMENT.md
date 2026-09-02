# Marble Studios App — notas de desenvolvimento

## Como correr o projeto

```
npx expo start --web      # preview no browser
npx expo start            # QR code para abrir na app Expo Go (Android/iOS)
```

## Estado atual (fase MVP — UI com dados de exemplo)

Ecrãs construídos e verificados a renderizar corretamente:
- `src/screens/HomeScreen.tsx` — Início
- `src/screens/PortfolioScreen.tsx` — Portfólio
- `src/screens/EventsScreen.tsx` — Eventos
- `src/screens/AlertsScreen.tsx` — Alertas
- `src/screens/ProfileScreen.tsx` — Perfil
- `src/screens/WorkDetailScreen.tsx` — Detalhe de um trabalho

Todos usam dados de exemplo fixos no próprio ficheiro (arrays no topo de cada
screen). Ainda não há ligação real à base de dados.

## Por fazer a seguir

1. **Firebase real** — `src/firebase/config.ts` tem placeholders (`'TODO'`).
   Criar o projeto em https://console.firebase.google.com, ativar
   Firestore + Authentication, e colar a config real aí.
2. **Ligar os ecrãs ao Firestore** — substituir os arrays de exemplo por
   queries reais.
3. **Painel da equipa (backoffice)** — ainda não desenhado nem construído.
4. **Notificações push** — Firebase Cloud Messaging + lógica dos lembretes
   automáticos (checkup 1 semana depois, etc.) ainda por implementar.
5. **Fotos reais** — só o Jaguar (`assets/work-jaguar-purple.jpg`) e o
   logótipo são reais; o resto são placeholders com gradiente dourado
   (`src/components/PlaceholderThumb.tsx`).

## Nota importante: pasta do projeto está dentro do OneDrive

Isto causa um problema real: o Metro (o compilador do Expo) às vezes não
deteta alterações a ficheiros guardados nesta pasta, porque o OneDrive
interfere com a monitorização de ficheiros do Windows. Sintoma: editas um
ficheiro, mas o que aparece no telemóvel/browser continua a versão antiga.

**Solução se isto acontecer:** parar o servidor (Ctrl+C) e voltar a correr
`npx expo start`. Isso força a reler tudo do disco.

**Solução definitiva (recomendada):** mover esta pasta para fora do
OneDrive, por exemplo para `C:\Users\VGodr\Projects\marble-app`. Pastas de
projetos de código não devem viver em pastas sincronizadas na cloud
(OneDrive/Dropbox/Google Drive) — é uma prática standard, não é specific
a este projeto.
