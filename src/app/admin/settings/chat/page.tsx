"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Trash2, 
  X, 
  AlertTriangle, 
  Image as ImageIcon, 
  Video, 
  Music,
  FileText,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useChatStore } from '@/store/chat-store';
import type { ChatMessage } from '@/lib/chat-api';

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

interface Attachment {
  _id: string;
  filename: string;
  size: number;
  type: string;
  url: string;
  messageId: string;
  createdAt: string;
}

export default function ChatManagementPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { rooms, loadRooms, messagesByRoomId, fetchMessages } = useChatStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [roomAssets, setRoomAssets] = useState<Attachment[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  
  // Delete confirmations
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Attachment | null>(null);
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

  const loadRoomAssets = async (room: ChatRoom) => {
    setIsLoadingAssets(true);
    setSelectedRoom(room);
    
    try {
      // First, fetch messages if not already loaded
      if (!messagesByRoomId[room._id]) {
        await fetchMessages(room._id);
      }
      
      // Extract all attachments from messages
      const messages = messagesByRoomId[room._id] || [];
      const assets: Attachment[] = [];
      
      messages.forEach((msg: ChatMessage) => {
        if (msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach(att => {
            assets.push({
              ...att,
              messageId: msg._id,
              createdAt: msg.createdAt
            });
          });
        }
      });
      
      // Sort by newest first
      assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRoomAssets(assets);
      setExpandedRoomId(room._id);
    } catch (error) {
      console.error("Failed to load room assets:", error);
      toast.error("Failed to load room assets");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    
    setIsDeleting(true);
    try {
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
        
        // Clear selected room if it was deleted
        if (selectedRoom?._id === roomToDelete._id) {
          setSelectedRoom(null);
          setRoomAssets([]);
          setExpandedRoomId(null);
        }
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

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = await getToken();
      
      const response = await fetch(`/api/chat/message/${assetToDelete.messageId}/attachment/${assetToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete attachment");
      }
      
      if (result.success) {
        toast.success("Attachment deleted successfully");
        
        // Remove from local state
        setRoomAssets(prev => prev.filter(a => a._id !== assetToDelete._id));
        
        // Refresh messages for the room
        if (selectedRoom) {
          await fetchMessages(selectedRoom._id);
        }
      } else {
        throw new Error(result.error || "Failed to delete attachment");
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete attachment");
    } finally {
      setIsDeleting(false);
      setAssetToDelete(null);
    }
  };

  const getAssetIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (type.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (type.startsWith('audio/')) return <Music className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const toggleRoomExpansion = (room: ChatRoom) => {
    if (expandedRoomId === room._id) {
      setExpandedRoomId(null);
      setSelectedRoom(null);
      setRoomAssets([]);
    } else {
      loadRoomAssets(room);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
      {/* Delete Room Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
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
              <p className="mb-2">Are you sure you want to delete this chat room and all its messages?</p>
              <p className="mb-4 text-red-400 font-medium">This action cannot be undone.</p>
              <div className="p-3 bg-gray-700/50 rounded text-sm">
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
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Asset Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                Delete Attachment
              </h3>
              <button 
                onClick={() => setAssetToDelete(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-gray-300 mb-6">
              <p className="mb-2">Are you sure you want to delete this attachment?</p>
              <p className="mb-4 text-red-400 font-medium">This action cannot be undone.</p>
              <div className="p-3 bg-gray-700/50 rounded text-sm">
                <div className="font-medium">{assetToDelete.filename}</div>
                <div className="text-gray-400">{formatFileSize(assetToDelete.size)}</div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setAssetToDelete(null)}
                className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAsset}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => router.push('/admin/settings')}
          className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Settings
        </button>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Chat Management
            </h1>
            <p className="text-gray-400 mt-1">
              Manage chat rooms and their assets
            </p>
          </div>
          
          <div className="text-sm text-gray-400">
            Total Rooms: <span className="text-white font-medium">{rooms.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center">
            <p className="text-gray-400">No active chat rooms found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div 
                key={room._id} 
                className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all"
              >
                {/* Room Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleRoomExpansion(room)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {expandedRoomId === room._id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-white">
                          {room.customer?.name || 'Unknown Customer'}
                          {room.customer?.phone && (
                            <span className="text-gray-400 ml-2 text-sm">({room.customer.phone})</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          Last message: {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleString() : 'No messages'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => setRoomToDelete(room)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Room
                  </Button>
                </div>

                {/* Room Assets (Expanded) */}
                {expandedRoomId === room._id && (
                  <div className="border-t border-gray-700/50 bg-gray-900/30 p-4">
                    {isLoadingAssets ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : roomAssets.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No assets found in this chat room</p>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-300">
                            Assets ({roomAssets.length})
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {roomAssets.map((asset) => (
                            <div 
                              key={asset._id}
                              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600/50 transition-all group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="text-blue-400 mt-1">
                                    {getAssetIcon(asset.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">
                                      {asset.filename}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {formatFileSize(asset.size)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {new Date(asset.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex gap-1">
                                  <a
                                    href={asset.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                  <button
                                    onClick={() => setAssetToDelete(asset)}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Preview for images */}
                              {asset.type.startsWith('image/') && (
                                <div className="mt-2 rounded overflow-hidden relative w-full h-32">
                                  <Image 
                                    src={asset.url} 
                                    alt={asset.filename}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
