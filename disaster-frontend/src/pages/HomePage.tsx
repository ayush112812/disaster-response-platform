import { Title, Text, Button, Container } from '@mantine/core';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <Container>
      <Title order={1} mb="md">Welcome to Disaster Response Platform</Title>
      <Text size="lg" mb="lg">
        A platform for managing and responding to disasters in real-time.
      </Text>
      <Button component={Link} to="/disasters" size="lg">
        View Disasters
      </Button>
    </Container>
  );
}

export default HomePage;
