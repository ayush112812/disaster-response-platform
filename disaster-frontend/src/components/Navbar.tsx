import { Group, Title, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <Group justify="space-between" px="md">
      <Title order={3}>Disaster Response</Title>
      <Group>
        <Anchor component={Link} to="/">Home</Anchor>
        <Anchor component={Link} to="/disasters">Disasters</Anchor>
      </Group>
    </Group>
  );
}

export default Navbar;
