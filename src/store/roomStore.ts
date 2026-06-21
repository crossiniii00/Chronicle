import { create } from 'zustand';
import { RoomService } from '@/services/RoomService';
import { useAuthStore } from './authStore';
import type { InterviewRoom } from '@/types/misc';

type NullableRoomPatch = {
    [K in keyof InterviewRoom]?: InterviewRoom[K] | null;
};

type RoomPatch = NullableRoomPatch & Record<string, unknown>;

interface RoomStore {
    rooms: InterviewRoom[];
    loading: boolean;
    loadRooms: (silent?: boolean) => Promise<void>;
    updateRoom: (roomId: string, patch: RoomPatch) => Promise<void>;
    addRoom: (roomData: Partial<InterviewRoom>) => Promise<string | void>;
    deleteRoom: (roomId: string) => Promise<void>;
    freeRoomByApplicationId: (applicationId: string) => Promise<void>;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
    rooms: [],
    loading: false,

    loadRooms: async (silent?: boolean) => {
        const { user } = useAuthStore.getState();
        if (!user) {
            console.warn('[roomStore] loadRooms called but no user is logged in');
            set({ loading: false });
            return;
        }

        if (!silent) set({ loading: true });
        try {
            const fbRooms = await RoomService.getAll();
            set({ rooms: fbRooms || [] });
        } catch (err) {
            console.error('Failed to load rooms:', err);
        } finally {
            set({ loading: false });
        }
    },

    updateRoom: async (roomId, patch) => {
        if (!roomId) {
            console.error('updateRoom called without roomId', { patch });
            return;
        }

        // Sanitize patch for Firestore (no undefined)
        const sanitizedPatch = Object.entries(patch).reduce<Record<string, unknown>>((acc, [key, value]) => {
            acc[key] = value === undefined ? null : value;
            return acc;
        }, {});

        // Immediate Optimistic update
        set(state => {
            const nextRooms = state.rooms.map(r => r.id === roomId ? { ...r, ...sanitizedPatch } : r);
            return { rooms: nextRooms };
        });

        try {
            await RoomService.update(roomId, sanitizedPatch);

            // Re-fetch to ensure sync with DB (silent)
            setTimeout(() => {
                get().loadRooms(true);
            }, 3000);
        } catch (err) {
            console.error(`[roomStore] Failed to update room ${roomId}:`, err);
        }
    },

    addRoom: async (roomData) => {
        try {
            const newId = await RoomService.add(roomData);
            if (newId) {
                // Background reload to sync with any server-side changes (silent)
                get().loadRooms(true);
                return newId;
            }
        } catch (err) {
            console.error('Failed to add room:', err);
            throw err;
        }
    },

    deleteRoom: async (roomId) => {
        if (!roomId) {
            console.error('deleteRoom called without roomId');
            return;
        }

        try {
            await RoomService.delete(roomId);
            // Remove from local state immediately
            set(state => ({
                rooms: state.rooms.filter(r => r.id !== roomId)
            }));
        } catch (err) {
            console.error(`[roomStore] Failed to delete room ${roomId}:`, err);
            // Re-fetch to restore correct state (silent)
            get().loadRooms(true);
            throw err;
        }
    },

    freeRoomByApplicationId: async (applicationId) => {
        const { rooms, updateRoom } = get();
        const room = rooms.find(r => r.current_application_id === applicationId);
        if (room) {
            await updateRoom(room.id, {
                status: 'AVAILABLE',
                current_application_id: null,
                current_applicant_name: null,
                occupied_since: null
            });
        }
    }
}));
