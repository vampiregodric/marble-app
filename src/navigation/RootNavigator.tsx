import React from 'react';
import { NavigationContainer, DarkTheme, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import { HomeIcon, GridIcon, CalendarIcon, BellIcon, UserIcon } from '../components/Icons';
import HomeScreen from '../screens/HomeScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import EventsScreen from '../screens/EventsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkDetailScreen from '../screens/WorkDetailScreen';
import { RootStackParamList, TabParamList } from './types';

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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.screen,
          borderTopColor: colors.hairline,
          height: 62,
          paddingBottom: 8,
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} options={{ tabBarLabel: 'Portfólio' }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ tabBarLabel: 'Eventos' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alertas' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
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
    },
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="WorkDetail" component={WorkDetailScreen} options={{ presentation: 'card' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
