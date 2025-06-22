import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
export default defineConfig({
    plugins: [
        react({
            jsxImportSource: '@emotion/react',
            babel: {
                plugins: ['@emotion/babel-plugin'],
            },
        })
    ],
    server: {
        port: 3001,
        host: '0.0.0.0',
        strictPort: true,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                secure: false,
            },
            '/socket.io': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    preview: {
        port: 3001,
        host: true,
    },
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(__dirname, 'src'),
            },
        ],
    },
    define: {
        'process.env': {},
    },
});
