"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useChatStore } from '@/store/chat-store';

// Define the ChatRoom type based on the chat store
interface ChatRoom {
  _id: string;
  roomName: string;
  customer?: { _id: string; name?: string; phone?: string };
  lastMessageAt?: string;
  lastMessage?: string;
  unreadForCustomer?: number;
  unreadForAdmins?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function AdminChatManagementSection() {
  const { getToken } = useAuth();
  const { rooms, loadRooms } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadChatRooms = async () => {
      setIsLoading(true);
      try {
        await loadRooms(); // Load all admin rooms
      } catch (error) {
        console.error("Failed to load chat rooms:", error);
        toast.error("Failed to load chat rooms");
      } finally {
        setIsLoading(false);
      }
    };

    loadChatRooms();
  }, [loadRooms]);

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    
    setIsDeleting(true);
    try {
      // Get the session token using Clerk's auth
      const token = await getToken();
      
      const response = await fetch(`/api/chat/room/${roomToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete chat room");
      }
      
      if (result.success) {
        toast.success("Chat room and all messages deleted successfully");
        await loadRooms(); // Refresh the list
      } else {
        throw new Error(result.error || "Failed to delete chat room");
      }
    } catch (error) {
      console.error("Error deleting chat room:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete chat room");
    } finally {
      setIsDeleting(false);
      setRoomToDelete(null);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 sm:p-6 space-y-4">
      {/* Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                Delete Chat Room
              </h3>
              <button 
                onClick={() => setRoomToDelete(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-gray-300 mb-6">
              <p>Are you sure you want to delete this chat room and all its messages?</p>
              <p className="mb-4">This action cannot be undone.</p>
              <div className="p-2 bg-gray-700/50 rounded text-sm">
                {roomToDelete.customer?.name ? (
                  <>
                    <div className="font-medium">Customer: {roomToDelete.customer.name}</div>
                    {roomToDelete.customer.phone && (
                      <div>Phone: {roomToDelete.customer.phone}</div>
                    )}
                  </>
                ) : (
                  <div className="text-amber-300">No customer information available</div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setRoomToDelete(null)}
                className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRoom}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Chat Management</h3>
          <p className="text-sm text-gray-400">
            Manage chat rooms and their contents
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-300 mb-2">Active Chat Rooms</div>
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-gray-400">No active chat rooms found</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {rooms.map((room) => (
              <div 
                key={room._id} 
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
              >
                <div>
                  <div className="font-medium text-white">
                    {room.customer?.name || 'Unknown Customer'}
                    {room.customer?.phone && (
                      <span className="text-gray-400 ml-2">({room.customer.phone})</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Last message: {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleString() : 'No messages'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => setRoomToDelete(room)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
