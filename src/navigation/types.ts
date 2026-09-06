import { NavigatorScreenParams } from '@react-navigation/native';
import { LegalDoc } from '../legal/texts';
import { DepartmentId, WorkCategory, WorkServiceId } from '../firebase/models';

export type TabParamList = {
  Home: undefined;
  // Portfólio já filtrado: a página de um departamento (Secção 9) manda a
  // `category` ("Ver portfólio"); um cartão de "O que fazemos" manda também
  // o `service` (Secção 14), sempre da mesma categoria. Na web chegam pela
  // query string (portfolio?category=Automotive&service=ppf) — o ecrã
  // valida os dois antes de os aplicar.
  Portfolio: { category?: WorkCategory; service?: WorkServiceId } | undefined;
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
  // Sem nada, o formulário pede o departamento.
  RequestQuote: { workId?: string; department?: DepartmentId } | undefined;
};
