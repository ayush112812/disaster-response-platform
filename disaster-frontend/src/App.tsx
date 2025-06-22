import React from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Create a theme instance
const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  primaryColor: 'blue',
  colors: {
    // Custom emergency colors
    emergency: [
      '#fff5f5',
      '#fed7d7',
      '#feb2b2',
      '#fc8181',
      '#f56565',
      '#e53e3e',
      '#c53030',
      '#9b2c2c',
      '#822727',
      '#63171b'
    ],
  },
  components: {
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '600',
  },
});

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" autoClose={5000} />
          <Router>
            <AppRoutes />
          </Router>
        </MantineProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
