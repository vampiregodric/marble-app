import { NavigatorScreenParams } from '@react-navigation/native';
import { LegalDoc } from '../legal/texts';
import { DepartmentId, WorkCategory } from '../firebase/models';

export type TabParamList = {
  Home: undefined;
  // Os cartões dos departamentos no Início abrem o Portfólio já filtrado.
  Portfolio: { category?: WorkCategory } | undefined;
  Events: undefined;
  Alerts: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  WorkDetail: { workId: string };
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
