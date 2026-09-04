import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Referência ao NavigationContainer para navegar de fora dos ecrãs — hoje
// só ao tocar num push (RootNavigator → openFromPush). Nos ecrãs usa-se
// sempre useNavigation().
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
