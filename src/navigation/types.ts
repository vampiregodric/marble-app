import { NavigatorScreenParams } from '@react-navigation/native';
import { LegalDoc } from '../legal/texts';

export type TabParamList = {
  Home: undefined;
  Portfolio: undefined;
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
};
