import { useColorScheme } from 'nativewind';
import { themeColors } from '../constants';

export function useAppTheme() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return {
    colors: themeColors(isDark),
    isDark,
  };
}
