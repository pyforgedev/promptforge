import { useEffect } from 'react';
import { useAppContext } from './useAppContext';
import { useEffectiveTheme } from './useEffectiveTheme';

export function useFavicon() {
  const { preferences } = useAppContext();
  const effectiveTheme = useEffectiveTheme(preferences.theme);

  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    link.type = 'image/svg+xml';
    link.href = effectiveTheme === 'dark' ? '/assets/favicon-dark.svg' : '/assets/favicon-light.svg';
  }, [effectiveTheme]);
}
