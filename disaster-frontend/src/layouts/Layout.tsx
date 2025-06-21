import { AppShell, Container } from '@mantine/core';
import Navbar from '../components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <AppShell
      padding="md"
      header={{
        height: 60,
        offset: false,
      }}
    >
      <AppShell.Header p="xs">
        <Navbar />
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg">{children}</Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default Layout;
