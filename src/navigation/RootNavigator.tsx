import React, { useRef, useState } from 'react';
import { NavigationContainer, DarkTheme, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';
import { HomeIcon, GridIcon, CalendarIcon, BellIcon, UserIcon } from '../components/Icons';
import HomeScreen from '../screens/HomeScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import EventsScreen from '../screens/EventsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkDetailScreen from '../screens/WorkDetailScreen';
import DepartmentScreen from '../screens/DepartmentScreen';
import RequestQuoteScreen from '../screens/RequestQuoteScreen';
import PersonalDataScreen from '../screens/PersonalDataScreen';
import LegalScreen from '../screens/LegalScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import NotificationsOnboardingScreen from '../screens/NotificationsOnboardingScreen';
import AuthGate from '../components/AuthGate';
import { markNotificationRead } from '../data/notifications';
import { PushOpenData, usePushOpens } from '../push/push';
import { useNotificationsOnboardingTrigger } from '../push/onboarding';
import { navigationRef } from './navigationRef';
import { RootStackParamList, TabParamList } from './types';
import { useT } from '../i18n';

// Perfil e Alertas precisam de conta — sem sessão mostram o ecrã de login no
// lugar do tab. Início, Portfólio e Eventos ficam abertos a toda a gente.
function AlertsTab() {
  return (
    <AuthGate>
      <AlertsScreen />
    </AuthGate>
  );
}

function ProfileTab() {
  return (
    <AuthGate>
      <ProfileScreen />
    </AuthGate>
  );
}

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.screen,
    card: colors.screen,
    border: colors.hairline,
    primary: colors.gold,
    text: colors.ink,
  },
};

function Tabs() {
  // A barra de tabs tem altura fixa (62) — o React Navigation só soma a margem
  // do sistema (barra de navegação Android / home indicator iOS) quando não
  // definimos altura, por isso somamos nós. No web o inset é 0.
  const insets = useSafeAreaInsets();
  const T = useT();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.screen,
          borderTopColor: colors.hairline,
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.goldBright,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontFamily: fonts.eyebrow, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 },
        tabBarIcon: ({ color, size }) => {
          const iconSize = size ? size * 0.8 : 18;
          switch (route.name) {
            case 'Home':
              return <HomeIcon size={iconSize} color={color} />;
            case 'Portfolio':
              return <GridIcon size={iconSize} color={color} />;
            case 'Events':
              return <CalendarIcon size={iconSize} color={color} />;
            case 'Alerts':
              return <BellIcon size={iconSize} color={color} />;
            case 'Profile':
              return <UserIcon size={iconSize} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: T.tabs.home }} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} options={{ tabBarLabel: T.tabs.portfolio }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ tabBarLabel: T.tabs.events }} />
      <Tab.Screen name="Alerts" component={AlertsTab} options={{ tabBarLabel: T.tabs.alerts }} />
      <Tab.Screen name="Profile" component={ProfileTab} options={{ tabBarLabel: T.tabs.profile }} />
    </Tab.Navigator>
  );
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Portfolio: 'portfolio',
          Events: 'events',
          Alerts: 'alerts',
          Profile: 'profile',
        },
      },
      WorkDetail: 'work/:workId',
      Department: 'services/:id',
      PersonalData: 'profile/personal-data',
      Legal: 'legal/:doc',
      DeleteAccount: 'profile/delete-account',
      RequestQuote: 'request',
      NotificationsOnboarding: 'welcome/notifications',
    },
  },
};

// Toque num push (Secção 6): abre o mesmo sítio que tocar no alerta no ecrã
// Alertas (o trabalho, a tab Eventos, o Perfil com o carro/chão) e marca-o
// como lido. Os ids vêm no `data` do push (Cloud Functions → push.ts).
function openFromPush(data: PushOpenData) {
  if (data.notificationId) markNotificationRead(data.notificationId).catch(() => {});
  if (data.relatedWorkId) navigationRef.navigate('WorkDetail', { workId: data.relatedWorkId });
  else if (data.relatedEventId) navigationRef.navigate('Tabs', { screen: 'Events' });
  else if (data.relatedVehicleId || data.relatedRequestId) navigationRef.navigate('Tabs', { screen: 'Profile' });
  else navigationRef.navigate('Tabs', { screen: 'Alerts' });
}

export default function RootNavigator() {
  // Arranque a frio a partir de um push: o toque chega antes de o
  // NavigationContainer estar pronto — guarda-se e abre-se em onReady.
  const pendingPush = useRef<PushOpenData | null>(null);
  usePushOpens((data) => {
    if (navigationRef.isReady()) openFromPush(data);
    else pendingPush.current = data;
  });
  // Passo "Recebe os alertas no telemóvel" (Secção 15): abre-se sozinho,
  // uma vez por conta, quando os tabs estão à vista — ver src/push/onboarding.ts.
  const [ready, setReady] = useState(false);
  useNotificationsOnboardingTrigger(ready);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      linking={linking}
      onReady={() => {
        if (pendingPush.current) {
          openFromPush(pendingPush.current);
          pendingPush.current = null;
        }
        setReady(true);
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="WorkDetail" component={WorkDetailScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Department" component={DepartmentScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="RequestQuote" component={RequestQuoteScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="PersonalData" component={PersonalDataScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Legal" component={LegalScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="NotificationsOnboarding" component={NotificationsOnboardingScreen} options={{ presentation: 'card' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
