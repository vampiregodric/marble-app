// Configuração dinâmica do Expo. Parte do app.json (que continua a ser a
// fonte de tudo o que é estático) e só acrescenta o que depende da variante
// da build — ver DEVELOPMENT.md, "Lançamento nas lojas (Secção 11)".
//
// Duas variantes, escolhidas por APP_VARIANT (definido por perfil no eas.json):
//
//   production   "Marble Studios", pacote/bundle pt.marble.app — perfis
//                `production` e `preview`; Firebase de PROD.
//   development  "Marble Dev", pt.marble.app.dev — perfil `development`
//                (e tudo o que corre localmente sem APP_VARIANT); Firebase
//                de DEV. Instala-se ao lado da app real.
//
// Porquê pacotes diferentes: no EAS as credenciais Android (keystore e a
// chave FCM V1 que entrega o push) são guardadas por nome de pacote, não por
// perfil. Com um só pacote, dev e prod partilhariam a chave FCM e o push só
// funcionaria num deles.
//
// google-services.json (Firebase Android):
//   - o ficheiro da raiz é o de DEV (pacote pt.marble.app.dev) e serve as
//     builds de desenvolvimento;
//   - o de PROD (pt.marble.app) nunca fica no repositório: está carregado no
//     EAS como variável de ficheiro `GOOGLE_SERVICES_JSON` (ambiente
//     `production`), que o EAS expõe às builds `preview`/`production` como um
//     caminho absoluto. Localmente a variável não existe e cai-se no de dev.
const IS_PROD = process.env.APP_VARIANT === 'production';
const APP_ID = IS_PROD ? 'pt.marble.app' : 'pt.marble.app.dev';

module.exports = ({ config }) => ({
  ...config,
  name: IS_PROD ? config.name : 'Marble Dev',
  ios: {
    ...config.ios,
    bundleIdentifier: APP_ID,
  },
  android: {
    ...config.android,
    package: APP_ID,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
