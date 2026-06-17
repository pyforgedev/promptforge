import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-10',
  md: 'h-12',
  lg: 'h-24',
  xl: 'h-32'
};

export const AppLogo = memo(function AppLogo({ size = 'md', className = '' }: AppLogoProps) {
  const { t } = useTranslation();
  const { preferences } = useAppContext();
  const effectiveTheme = useEffectiveTheme(preferences.theme);

  const heightClass = sizeMap[size];
  const transitionClass = 'motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out';

  return (
    <div className={`relative shrink-0 ${heightClass} w-auto ${className}`}>
      <img
        src="/assets/light-logo.svg"
        alt={effectiveTheme === 'light' ? t('app.name', 'PromptForge') : ''}
        aria-hidden={effectiveTheme !== 'light'}
        className={`h-full w-auto object-contain ${transitionClass} ${effectiveTheme === 'light' ? 'opacity-100' : 'opacity-0'}`}
      />
      <img
        src="/assets/dark-logo.svg"
        alt={effectiveTheme === 'dark' ? t('app.name', 'PromptForge') : ''}
        aria-hidden={effectiveTheme !== 'dark'}
        className={`absolute inset-0 h-full w-auto object-contain ${transitionClass} ${effectiveTheme === 'dark' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
});
