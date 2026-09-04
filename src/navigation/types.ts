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
  // Página de serviços de um departamento (Secção 9), aberta pelo cartão
  // do Início. Conteúdo em src/data/departmentContent.ts.
  Department: { id: DepartmentId };
  // Pedido de orçamento (Secção 7). `workId` vem do Detalhe ("Pedir
  // orçamento semelhante"), `department` das páginas de departamento.
  RequestQuote: { workId?: string; department?: DepartmentId };
  PersonalData: undefined;
  // Política de privacidade / termos — acessível sem login (registo).
  Legal: { doc: LegalDoc };
  DeleteAccount: undefined;
};
