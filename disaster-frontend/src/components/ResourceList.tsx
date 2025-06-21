import React from 'react';
import { Resource } from '../types';

interface ResourceListProps {
  resources: Resource[];
}

const ResourceList: React.FC<ResourceListProps> = ({ resources }) => {
  return (
    <div>
      <h3>Resources</h3>
      {resources.length === 0 ? (
        <p>No resources available</p>
      ) : (
        <div>
          {resources.map((resource) => (
            <div key={resource.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h4>{resource.name}</h4>
              <p>Type: {resource.type}</p>
              <p>Status: {resource.status}</p>
              <p>Location: {resource.location_name}</p>
              {resource.description && <p>Description: {resource.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceList;
