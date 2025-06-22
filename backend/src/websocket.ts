import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { supabase } from './services/supabase';
import { getSocialMediaPosts, analyzePost } from './services/socialMedia';
import { scrapeOfficialUpdates } from './services/officialUpdates';

// Type definitions for Supabase payloads
interface SupabasePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  schema: string;
  table: string;
}

interface Disaster {
  id: string;
  status: string;
  [key: string]: any;
}

interface Resource {
  id: string;
  disaster_id: string;
  [key: string]: any;
}

interface Report {
  id: string;
  disaster_id: string;
  [key: string]: any;
}

let io: Server;

export function initializeWebsocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/'
  });

  // Set up real-time subscriptions
  setupRealtime();
  
  // Setup periodic updates for social media and official updates
  setupPeriodicUpdates();

  // Handle socket connections
  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    // Join a disaster room
    socket.on('join_disaster', (disasterId: string) => {
      socket.join(`disaster_${disasterId}`);
      console.log(`Socket ${socket.id} joined disaster_${disasterId}`);
    });

    // Leave a disaster room
    socket.on('leave_disaster', (disasterId: string) => {
      socket.leave(`disaster_${disasterId}`);
      console.log(`Socket ${socket.id} left disaster_${disasterId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

function setupRealtime() {
  // Set up real-time subscriptions for Supabase tables
  const disasterChanges = supabase
    .channel('disasters_changes')
    .on<SupabasePayload<Disaster>>(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'disasters' 
      },
      (payload) => {
        const event = getEventType(payload.eventType);
        const disasterId = (payload.new as Disaster)?.id || (payload.old as Disaster)?.id;
        if (disasterId) {
          io.to(`disaster_${disasterId}`).emit(
            `disaster_${event}`,
            payload.new || payload.old
          );
        }
      }
    )
    .subscribe();

  const resourceChanges = supabase
    .channel('resources_changes')
    .on<SupabasePayload<Resource>>(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'resources' 
      },
      (payload) => {
        const event = getEventType(payload.eventType);
        const disasterId = (payload.new as Resource)?.disaster_id || 
                          (payload.old as Resource)?.disaster_id;
        if (disasterId) {
          io.to(`disaster_${disasterId}`).emit(
            `resource_${event}`,
            payload.new || payload.old
          );
        }
      }
    )
    .subscribe();

  const reportChanges = supabase
    .channel('reports_changes')
    .on<SupabasePayload<Report>>(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'reports' 
      },
      (payload) => {
        const event = getEventType(payload.eventType);
        const disasterId = (payload.new as Report)?.disaster_id || 
                          (payload.old as Report)?.disaster_id;
        if (disasterId) {
          io.to(`disaster_${disasterId}`).emit(
            `report_${event}`,
            payload.new || payload.old
          );
        }
      }
    )
    .subscribe();
}

// Setup periodic updates for social media and official updates
function setupPeriodicUpdates() {
  // Check for updates every 10 seconds for assessment demonstration
  const UPDATE_INTERVAL = 10 * 1000;

  setInterval(async () => {
    try {
      // Get mock active disasters with variety for demonstration
      const allMockDisasters = [
        {
          id: '1',
          title: 'NYC Flood Emergency',
          status: 'active',
          severity: 'high',
          location_name: 'Manhattan, NYC',
          type: 'flood'
        },
        {
          id: '2',
          title: 'California Wildfire',
          status: 'active',
          severity: 'critical',
          location_name: 'Northern California',
          type: 'wildfire'
        },
        {
          id: '3',
          title: 'Hurricane Preparedness',
          status: 'active',
          severity: 'high',
          location_name: 'Gulf Coast, FL',
          type: 'hurricane'
        },
        {
          id: '4',
          title: 'Earthquake Response',
          status: 'active',
          severity: 'medium',
          location_name: 'Los Angeles, CA',
          type: 'earthquake'
        },
        {
          id: '5',
          title: 'Tornado Warning',
          status: 'active',
          severity: 'high',
          location_name: 'Oklahoma City, OK',
          type: 'tornado'
        },
        {
          id: '6',
          title: 'Blizzard Alert',
          status: 'active',
          severity: 'medium',
          location_name: 'Denver, CO',
          type: 'blizzard'
        },
        {
          id: '7',
          title: 'Volcanic Activity',
          status: 'monitoring',
          severity: 'low',
          location_name: 'Hawaii, HI',
          type: 'volcanic'
        },
        {
          id: '8',
          title: 'Severe Thunderstorm',
          status: 'active',
          severity: 'medium',
          location_name: 'Dallas, TX',
          type: 'storm'
        }
      ];

      // Randomly select 3-5 disasters to show variety each update
      const shuffled = allMockDisasters.sort(() => 0.5 - Math.random());
      const mockActiveDisasters = shuffled.slice(0, Math.floor(Math.random() * 3) + 3);

      // Broadcast active disasters to all clients
      io.emit('active_disasters_updated', {
        disasters: mockActiveDisasters,
        count: mockActiveDisasters.length,
        timestamp: new Date().toISOString()
      });

      // Update social media and check for priority alerts
      for (const disaster of mockActiveDisasters) {
        try {
          // Update social media
          const socialMediaData = await getSocialMediaPosts(disaster.id, { limit: 10 });
          io.to(`disaster_${disaster.id}`).emit('social_media_updated', socialMediaData);

          // Check for priority alerts
          const priorityAlerts = socialMediaData.data
            .filter((post: any) => post.isUrgent)
            .map((post: any) => ({
              id: post.id,
              type: 'priority_alert',
              content: post.content,
              location: post.location,
              urgencyScore: analyzePost(post.content).urgencyScore,
              timestamp: post.timestamp,
              disasterId: disaster.id,
              disasterTitle: disaster.title
            }));

          if (priorityAlerts.length > 0) {
            console.log(`🚨 Broadcasting ${priorityAlerts.length} priority alerts`);
            io.emit('priority_alerts', {
              alerts: priorityAlerts,
              count: priorityAlerts.length,
              message: `${priorityAlerts.length} urgent alerts detected`,
              timestamp: new Date().toISOString()
            });
          }

          // Update official updates
          const officialUpdates = await scrapeOfficialUpdates(disaster.id);
          io.to(`disaster_${disaster.id}`).emit('official_updates_updated', officialUpdates);

        } catch (error) {
          console.error(`Error updating disaster ${disaster.id}:`, error);
        }
      }

      // Broadcast general social media updates to all clients
      try {
        const allSocialMedia = await getSocialMediaPosts('general', { limit: 20 });
        io.emit('social_media_global_update', {
          posts: allSocialMedia.data,
          count: allSocialMedia.data.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching global social media:', error);
      }

    } catch (error) {
      console.error('Error in periodic update:', error);
    }
  }, UPDATE_INTERVAL);

  // Initial broadcast when server starts
  setTimeout(() => {
    console.log('🚀 Starting initial data broadcast...');

    // Broadcast initial active disasters with variety
    const initialDisasters = [
      {
        id: '1',
        title: 'NYC Flood Emergency',
        status: 'active',
        severity: 'high',
        location_name: 'Manhattan, NYC',
        type: 'flood'
      },
      {
        id: '2',
        title: 'California Wildfire',
        status: 'active',
        severity: 'critical',
        location_name: 'Northern California',
        type: 'wildfire'
      },
      {
        id: '3',
        title: 'Hurricane Preparedness',
        status: 'active',
        severity: 'high',
        location_name: 'Gulf Coast, FL',
        type: 'hurricane'
      },
      {
        id: '4',
        title: 'Earthquake Response',
        status: 'active',
        severity: 'medium',
        location_name: 'Los Angeles, CA',
        type: 'earthquake'
      }
    ];

    io.emit('active_disasters_updated', {
      disasters: initialDisasters,
      count: initialDisasters.length,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Initial data broadcast complete');
  }, 2000); // Wait 2 seconds after server start
}

function getEventType(event: string): string {
  switch (event) {
    case 'INSERT':
      return 'created';
    case 'UPDATE':
      return 'updated';
    case 'DELETE':
      return 'deleted';
    default:
      return event.toLowerCase();
  }
}

export function emitToDisaster(disasterId: string, event: string, data: any) {
  if (io) {
    io.to(`disaster_${disasterId}`).emit(event, data);
  } else {
    console.warn('Socket.io not initialized, cannot emit event:', event);
  }
}

export function emitSocialMediaUpdate(disasterId: string, data: any) {
  emitToDisaster(disasterId, 'social_media_updated', data);
}

export function emitOfficialUpdates(disasterId: string, data: any) {
  emitToDisaster(disasterId, 'official_updates_updated', data);
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}


