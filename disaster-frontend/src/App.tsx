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
  /** Put your mantine theme override here */
  fontFamily: 'Inter, sans-serif',
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
