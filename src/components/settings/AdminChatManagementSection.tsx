"use client";

import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminChatManagementSection() {
  const router = useRouter();

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Chat Management</h3>
          <p className="text-sm text-gray-400">
            Manage chat rooms and their assets
          </p>
        </div>
        <MessageSquare className="h-6 w-6 text-blue-400" />
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          View and manage all chat rooms, messages, and attachments (images, videos, audio files).
        </p>
        
        <ul className="text-sm text-gray-400 space-y-1 ml-4">
          <li className="flex items-center">
            <span className="mr-2">•</span>
            View all active chat rooms
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Browse room assets (images, videos, audio)
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Delete individual attachments
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Delete entire chat rooms
          </li>
        </ul>

        <Button
          onClick={() => router.push('/admin/settings/chat')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 mt-4"
        >
          Open Chat Management
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
