import { AppShell, Container, Box } from '@mantine/core';
import Navbar from '../components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <AppShell
      padding="md"
      header={{
        height: 70,
        offset: false,
      }}
    >
      <AppShell.Header
        style={{
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Navbar />
      </AppShell.Header>
      <AppShell.Main
        style={{
          backgroundColor: '#f8f9fa',
          minHeight: 'calc(100vh - 70px)'
        }}
      >
        <Box py="md">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

export default Layout;
