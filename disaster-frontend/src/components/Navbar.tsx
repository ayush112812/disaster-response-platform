import { Group, Title, Badge, Button } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconHome, IconMapPin, IconNews, IconActivity } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Group justify="space-between" px="md" py="sm">
      <Group>
        <IconAlertTriangle size={28} color="red" />
        <Title order={3} c="blue">🚨 Disaster Response Platform</Title>
      </Group>
      <Group gap="xs">
        <Button
          component={Link}
          to="/"
          variant={isActive('/') ? 'filled' : 'subtle'}
          leftSection={<IconHome size={16} />}
          size="sm"
        >
          Dashboard
        </Button>
        <Button
          component={Link}
          to="/disasters"
          variant={isActive('/disasters') ? 'filled' : 'subtle'}
          leftSection={<IconAlertTriangle size={16} />}
          size="sm"
        >
          Disasters
        </Button>
        <Button
          component={Link}
          to="/social-media"
          variant={isActive('/social-media') ? 'filled' : 'subtle'}
          leftSection={<IconBell size={16} />}
          size="sm"
          rightSection={
            <Badge size="xs" color="orange" variant="filled">
              Live
            </Badge>
          }
        >
          Social Media
        </Button>
        <Button
          component={Link}
          to="/resources"
          variant={isActive('/resources') ? 'filled' : 'subtle'}
          leftSection={<IconMapPin size={16} />}
          size="sm"
        >
          Resources
        </Button>
        <Button
          component={Link}
          to="/official-updates"
          variant={isActive('/official-updates') ? 'filled' : 'subtle'}
          leftSection={<IconNews size={16} />}
          size="sm"
        >
          Official Updates
        </Button>
        <Button
          component={Link}
          to="/realtime-dashboard"
          variant={isActive('/realtime-dashboard') ? 'filled' : 'subtle'}
          leftSection={<IconActivity size={16} />}
          size="sm"
          rightSection={
            <Badge size="xs" color="red" variant="filled">
              Live
            </Badge>
          }
        >
          Real-Time
        </Button>
      </Group>
    </Group>
  );
}

export default Navbar;
