import React from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface DarkModeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline' | 'subtle';
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ 
  size = 'md', 
  variant = 'subtle' 
}) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <Tooltip label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
      <ActionIcon
        variant={variant}
        size={size}
        onClick={toggleDarkMode}
        style={{
          transition: 'all 0.2s ease',
        }}
      >
        {isDarkMode ? (
          <IconSun size={18} />
        ) : (
          <IconMoon size={18} />
        )}
      </ActionIcon>
    </Tooltip>
  );
};
