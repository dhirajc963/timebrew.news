import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'minimal';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'icon',
  className = ''
}) => {
  const { theme, toggleTheme } = useTheme();

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleTheme}
        className={`text-muted-foreground hover:text-foreground hover:bg-muted/30 p-1 rounded-md transition-colors ${className}`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all ${className}`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <>
            <Moon className="w-4 h-4" />
            <span>Dark Mode</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4" />
            <span>Light Mode</span>
          </>
        )}
      </button>
    );
  }

  // Default icon variant
  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-colors ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </button>
  );
};

export default ThemeToggle;