import { useState, useEffect } from 'react';
import type { Theme } from '@/types';

function getInitialTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme as 'light' | 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useEffectiveTheme(theme: Theme): 'light' | 'dark' {
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => getInitialTheme(theme));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      if (theme === 'system') {
        setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setEffectiveTheme(theme as 'light' | 'dark');
      }
    };

    updateTheme();

    if (theme === 'system') {
      const listener = (e: MediaQueryListEvent) => {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  return effectiveTheme;
}
