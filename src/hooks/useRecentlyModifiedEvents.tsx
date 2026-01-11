import { create } from 'zustand';

interface RecentlyModifiedState {
  // Set of event IDs that were recently created or modified
  recentEventIds: Set<string>;
  // Set of recurrence group IDs for recurring events
  recentRecurrenceGroups: Set<string>;
  
  // Mark event(s) as recently created/modified
  markEventAsRecent: (eventId: string, recurrenceGroupId?: string | null) => void;
  markEventsAsRecent: (eventIds: string[], recurrenceGroupId?: string | null) => void;
  
  // Check if an event should be highlighted
  isEventRecent: (eventId: string, recurrenceGroupId?: string | null) => boolean;
  
  // Clear the highlight (called when user navigates away and comes back)
  clearAll: () => void;
}

// Using Zustand for simple global state management
// This will persist across navigations within the same session
export const useRecentlyModifiedEvents = create<RecentlyModifiedState>((set, get) => ({
  recentEventIds: new Set<string>(),
  recentRecurrenceGroups: new Set<string>(),
  
  markEventAsRecent: (eventId: string, recurrenceGroupId?: string | null) => {
    set((state) => {
      const newEventIds = new Set(state.recentEventIds);
      newEventIds.add(eventId);
      
      const newGroups = new Set(state.recentRecurrenceGroups);
      if (recurrenceGroupId) {
        newGroups.add(recurrenceGroupId);
      }
      
      return {
        recentEventIds: newEventIds,
        recentRecurrenceGroups: newGroups,
      };
    });
  },
  
  markEventsAsRecent: (eventIds: string[], recurrenceGroupId?: string | null) => {
    set((state) => {
      const newEventIds = new Set(state.recentEventIds);
      eventIds.forEach(id => newEventIds.add(id));
      
      const newGroups = new Set(state.recentRecurrenceGroups);
      if (recurrenceGroupId) {
        newGroups.add(recurrenceGroupId);
      }
      
      return {
        recentEventIds: newEventIds,
        recentRecurrenceGroups: newGroups,
      };
    });
  },
  
  isEventRecent: (eventId: string, recurrenceGroupId?: string | null) => {
    const state = get();
    // Check if event ID is in recent set
    if (state.recentEventIds.has(eventId)) {
      return true;
    }
    // Check if event belongs to a recently modified recurrence group
    if (recurrenceGroupId && state.recentRecurrenceGroups.has(recurrenceGroupId)) {
      return true;
    }
    return false;
  },
  
  clearAll: () => {
    set({
      recentEventIds: new Set<string>(),
      recentRecurrenceGroups: new Set<string>(),
    });
  },
}));
