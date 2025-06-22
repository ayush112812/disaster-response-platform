interface Config {
  apiUrl: string;
  websocketUrl: string;
  mapboxToken: string;
  geminiApiKey: string;
  features: {
    realTimeUpdates: boolean;
    imageVerification: boolean;
    socialMediaMonitoring: boolean;
    resourceManagement: boolean;
  };
}

const development: Config = {
  apiUrl: 'http://localhost:5001',
  websocketUrl: 'ws://localhost:5001',
  mapboxToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  features: {
    realTimeUpdates: true,
    imageVerification: true,
    socialMediaMonitoring: true,
    resourceManagement: true,
  },
};

const production: Config = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || '',
  mapboxToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  features: {
    realTimeUpdates: true,
    imageVerification: true,
    socialMediaMonitoring: true,
    resourceManagement: true,
  },
};

const test: Config = {
  apiUrl: 'http://localhost:5001',
  websocketUrl: 'ws://localhost:5001',
  mapboxToken: 'test-mapbox-token',
  geminiApiKey: 'test-gemini-api-key',
  features: {
    realTimeUpdates: false,
    imageVerification: false,
    socialMediaMonitoring: false,
    resourceManagement: true,
  },
};

const configs = {
  development,
  production,
  test,
};

const environment = import.meta.env.MODE || 'development';

export const config: Config = configs[environment as keyof typeof configs];

// Validate required configuration
const requiredConfigs = ['apiUrl', 'websocketUrl', 'mapboxToken', 'geminiApiKey'];
for (const key of requiredConfigs) {
  if (!config[key as keyof Config]) {
    console.error(`Missing required configuration: ${key}`);
  }
}

export default config;