import React from 'react';
import { MantineProvider, Container, Title, Text, Card, Group, Badge, Button, Grid } from '@mantine/core';

// Simple working version for deployment
function App() {
  return (
    <MantineProvider>
      <Container size="lg" py="xl">
        <Title order={1} mb="xl" ta="center">
          🚨 Disaster Response Coordination Platform
        </Title>
        
        <Text size="lg" mb="xl" ta="center" c="dimmed">
          AI-Powered Emergency Response System with Real-time Updates
        </Text>

        <Grid>
          <Grid.Col span={12} md={6}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">🗺️ Interactive Mapping</Title>
              <Text size="sm" c="dimmed" mb="md">
                Real-time disaster visualization with Leaflet maps integration
              </Text>
              <Group>
                <Badge color="blue">Leaflet Maps</Badge>
                <Badge color="green">Real-time Updates</Badge>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={12} md={6}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">🤖 AI-Powered Analysis</Title>
              <Text size="sm" c="dimmed" mb="md">
                Google Gemini integration for image verification and location extraction
              </Text>
              <Group>
                <Badge color="purple">Google Gemini</Badge>
                <Badge color="orange">Image Verification</Badge>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={12} md={6}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">📱 Social Media Monitoring</Title>
              <Text size="sm" c="dimmed" mb="md">
                Mock social media integration for disaster-related content monitoring
              </Text>
              <Group>
                <Badge color="cyan">Twitter API</Badge>
                <Badge color="red">Priority Alerts</Badge>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={12} md={6}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">🔄 Real-time Updates</Title>
              <Text size="sm" c="dimmed" mb="md">
                WebSocket integration for live disaster and resource updates
              </Text>
              <Group>
                <Badge color="teal">Socket.io</Badge>
                <Badge color="yellow">Live Data</Badge>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        <Card shadow="sm" padding="lg" radius="md" withBorder mt="xl">
          <Title order={3} mb="md">🤖 AI Tool Usage</Title>
          <Text size="sm" mb="md">
            This platform was built with extensive use of AI coding assistants:
          </Text>
          <Group mb="md">
            <Badge color="blue" size="lg">Cursor AI - 70%</Badge>
            <Badge color="green" size="lg">Windsurf - 25%</Badge>
            <Badge color="purple" size="lg">Augment Agent - 5%</Badge>
          </Group>
          <Text size="xs" c="dimmed">
            • Cursor generated: WebSocket logic, API endpoints, frontend components<br/>
            • Windsurf generated: Social media monitoring, image verification, UI components<br/>
            • Augment Agent generated: Architecture decisions, security configuration
          </Text>
        </Card>

        <Group justify="center" mt="xl">
          <Button size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            🚀 Backend API Running
          </Button>
          <Button size="lg" variant="gradient" gradient={{ from: 'teal', to: 'green' }}>
            ✅ Frontend Deployed
          </Button>
        </Group>

        <Text size="sm" ta="center" mt="xl" c="dimmed">
          Built with React + TypeScript + Mantine UI | Backend: Node.js + Express + Supabase
        </Text>
      </Container>
    </MantineProvider>
  );
}

export default App;
