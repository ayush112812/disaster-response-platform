import { AppShell, Container, Box } from '@mantine/core';
import { useViewportSize } from '@mantine/hooks';
import Navbar from '../components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { width } = useViewportSize();
  const isMobile = width < 768;
  const headerHeight = isMobile ? 60 : 70;

  return (
    <AppShell
      padding={isMobile ? "xs" : "md"}
      header={{
        height: headerHeight,
        offset: false,
      }}
    >
      <AppShell.Header
        style={{
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}
      >
        <Navbar />
      </AppShell.Header>
      <AppShell.Main
        style={{
          backgroundColor: '#f8f9fa',
          minHeight: `calc(100vh - ${headerHeight}px)`,
          paddingTop: isMobile ? '8px' : '16px'
        }}
      >
        <Container
          size="xl"
          px={isMobile ? "xs" : "md"}
          style={{
            width: '100%',
            maxWidth: '100%'
          }}
        >
          <Box py={isMobile ? "xs" : "md"}>
            {children}
          </Box>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default Layout;
