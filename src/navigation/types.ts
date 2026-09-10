import { NavigatorScreenParams } from '@react-navigation/native';
import { LegalDoc } from '../legal/texts';
import { DepartmentId, SimulationKind, WorkCategory, WorkServiceId } from '../firebase/models';

export type TabParamList = {
  Home: undefined;
  // Portfólio já filtrado: a página de um departamento (Secção 9) manda a
  // `category` ("Ver portfólio"); um cartão de "O que fazemos" manda também
  // o `service` (Secção 14), sempre da mesma categoria; uma tag do Detalhe
  // (Secção 17) manda a `brand` (texto, como está no trabalho) — sozinha
  // aplica-se em "Todos", porque as marcas atravessam categorias. Na web
  // chegam pela query string (portfolio?category=Automotive&service=ppf,
  // portfolio?brand=Inozetek) — o ecrã valida tudo antes de aplicar.
  Portfolio: { category?: WorkCategory; service?: WorkServiceId; brand?: string } | undefined;
  Events: undefined;
  Alerts: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  WorkDetail: { workId: string };
  // Página de serviços de um departamento (Secção 9), aberta pelo cartão
  // do Início. Conteúdo em src/data/departmentContent.ts.
  Department: { id: DepartmentId };
  PersonalData: undefined;
  // Política de privacidade / termos — acessível sem login (registo).
  Legal: { doc: LegalDoc };
  DeleteAccount: undefined;
  // Pedido de orçamento (Secção 7). A partir do Detalhe vem `workId`
  // ("orçamento semelhante"); a partir de uma página de departamento
  // (Secção 9: AI Business, Marble Ads; Secção 10: Xtreme) vem `department`.
  // Sem nada, o formulário pede o departamento. Com `simulationId` (Secção
  // 16) o pedido leva a simulação anexada e o departamento fica pelo tipo
  // (chão → Epoxy Floors, carro → Automotive).
  RequestQuote: { workId?: string; department?: DepartmentId; simulationId?: string } | undefined;
  // Simulador "como ficaria" (Secção 16). `kind` fixa chão/carro (páginas
  // de departamento); `workId` usa a capa do trabalho como amostra ("Ver no
  // meu chão/carro" no Detalhe); `simulationId` abre uma simulação já
  // feita (Perfil). Sem nada, o cliente escolhe chão ou carro.
  Simulator: { kind?: SimulationKind; workId?: string; simulationId?: string } | undefined;
  // Passo "Recebe os alertas no telemóvel" (Secção 15), uma vez por conta,
  // logo a seguir ao registo. Quem o abre é useNotificationsOnboardingTrigger
  // (src/push/onboarding.ts); na web também por URL (welcome/notifications).
  NotificationsOnboarding: undefined;
};
