import React from 'react';
import { OfficialUpdate } from '../services/api';

interface UpdatesListProps {
  updates: OfficialUpdate[];
}

const UpdatesList: React.FC<UpdatesListProps> = ({ updates }) => {
  return (
    <div>
      <h3>Official Updates</h3>
      {updates.length === 0 ? (
        <p>No updates available</p>
      ) : (
        <div>
          {updates.map((update) => (
            <div key={update.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h4>{update.title}</h4>
              <p>Source: {update.source}</p>
              <p>{update.content}</p>
              {update.url && (
                <a href={update.url} target="_blank" rel="noopener noreferrer">
                  Read more
                </a>
              )}
              <p><small>Published: {new Date(update.timestamp).toLocaleString()}</small></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdatesList;
