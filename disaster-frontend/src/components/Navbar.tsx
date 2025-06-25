import { Group, Title, Badge, Button, Burger, Drawer, Stack, Text, Box, ScrollArea } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconHome, IconMapPin, IconNews, IconActivity, IconDatabase, IconWorldLatitude } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { useDisclosure, useViewportSize } from '@mantine/hooks';
import { DarkModeToggle } from './DarkModeToggle';

function Navbar() {
  const location = useLocation();
  const { width } = useViewportSize();
  const [opened, { open, close }] = useDisclosure(false);

  // More aggressive breakpoints for better responsiveness
  const isVerySmall = width < 480;
  const isSmall = width < 768;
  const isLarge = width < 1400;

  // Show mobile menu much earlier to prevent overflow
  const showMobileMenu = width < 1400;

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: IconHome, shortLabel: 'Home' },
    { path: '/disasters', label: 'Disasters', icon: IconAlertTriangle, shortLabel: 'Disasters' },
    { path: '/social-media', label: 'Social Media', icon: IconBell, shortLabel: 'Social', badge: { text: 'Live', color: 'orange' } },
    { path: '/resources', label: 'Resources', icon: IconMapPin, shortLabel: 'Resources' },
    { path: '/official-updates', label: 'Official Updates', icon: IconNews, shortLabel: 'Updates' },
    { path: '/data-ingestion', label: 'Data Ingestion', icon: IconDatabase, shortLabel: 'Data', badge: { text: 'Core', color: 'blue' } },
    { path: '/geocoding', label: 'Geocoding', icon: IconWorldLatitude, shortLabel: 'Geo', badge: { text: 'AI', color: 'green' } },
    { path: '/test-features', label: '🧪 Test Features', icon: IconWorldLatitude, shortLabel: 'Test', badge: { text: 'TEST', color: 'red' } },
    { path: '/realtime-dashboard', label: 'Real-Time', icon: IconActivity, shortLabel: 'Live', badge: { text: 'Live', color: 'red' } }
  ];

  interface NavItem {
    path: string;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ size?: number }>;
    badge?: { text: string; color: string };
  }

  const renderNavButton = (item: NavItem, size: string = 'sm', fullWidth: boolean = false, useShortLabel: boolean = false) => (
    <Button
      key={item.path}
      component={Link}
      to={item.path}
      variant={isActive(item.path) ? 'filled' : 'subtle'}
      leftSection={<item.icon size={14} />}
      size={size}
      fullWidth={fullWidth}
      rightSection={
        item.badge && !useShortLabel ? (
          <Badge size="xs" color={item.badge.color} variant="filled">
            {item.badge.text}
          </Badge>
        ) : undefined
      }
      onClick={showMobileMenu ? close : undefined}
      style={{
        fontSize: useShortLabel ? '0.75rem' : undefined,
        padding: useShortLabel ? '0.25rem 0.5rem' : undefined,
        minWidth: 'auto'
      }}
    >
      {useShortLabel ? item.shortLabel : item.label}
    </Button>
  );

  // Get title based on screen size
  const getTitle = () => {
    if (isVerySmall) return '🚨 DRP';
    if (isSmall) return '🚨 Disaster Response';
    return '🚨 Disaster Response Platform';
  };

  const getTitleSize = () => {
    if (isVerySmall) return 5;
    if (isSmall) return 4;
    return 3;
  };

  return (
    <>
      <Box
        className="navbar-container"
        px={isVerySmall ? "xs" : "md"}
        py="sm"
        h="100%"
      >
        {/* Logo and Title Section */}
        <Group
          gap={isVerySmall ? "xs" : "sm"}
          className="navbar-logo-section"
          style={{ flexShrink: 1, minWidth: 0 }}
        >
          <IconAlertTriangle
            size={isVerySmall ? 20 : isSmall ? 24 : 28}
            color="red"
            style={{ flexShrink: 0 }}
          />
          <Title
            order={getTitleSize()}
            c="blue"
            className="navbar-title"
            style={{
              fontSize: isVerySmall ? '0.9rem' : isSmall ? '1.1rem' : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {getTitle()}
          </Title>
        </Group>

        {/* Navigation Section */}
        <Box className="navbar-menu-section">
          {/* Desktop Navigation with Dark Mode Toggle */}
          {!showMobileMenu && (
            <Group
              gap="xs"
              wrap="nowrap"
              className="navbar-desktop-menu"
              style={{ flexShrink: 0 }}
            >
              {navItems.map(item => renderNavButton(item, 'sm', false, isLarge))}

              {/* Dark Mode Toggle for Desktop */}
              <DarkModeToggle size="sm" variant="subtle" />
            </Group>
          )}

          {/* Mobile Controls */}
          {showMobileMenu && (
            <Group gap="xs" style={{ flexShrink: 0 }}>
              {/* Dark Mode Toggle for Mobile Header */}
              <DarkModeToggle size="sm" variant="subtle" />

              <Burger
                opened={opened}
                onClick={open}
                size={isVerySmall ? "xs" : "sm"}
                className="navbar-mobile-burger"
                style={{ flexShrink: 0 }}
              />
            </Group>
          )}
        </Box>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        title={
          <Group>
            <IconAlertTriangle size={24} color="red" />
            <Text fw={600} c="blue">Navigation Menu</Text>
          </Group>
        }
        position="right"
        size={isVerySmall ? "xs" : "sm"}
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        styles={{
          content: {
            height: '100vh'
          }
        }}
      >
        <ScrollArea style={{ height: 'calc(100vh - 80px)' }}>
          <Stack gap="xs" p="md">
            {navItems.map(item => renderNavButton(item, 'md', true, false))}
          </Stack>
        </ScrollArea>
      </Drawer>
    </>
  );
}

export default Navbar;
