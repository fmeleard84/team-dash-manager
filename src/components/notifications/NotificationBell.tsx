import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationCenterWithTabs } from './NotificationCenterWithTabs';
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { notifications } = useNotifications();
  
  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative hover:bg-purple-50"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[450px] p-0" 
        align="end"
        sideOffset={5}
      >
        <NotificationCenterWithTabs />
      </PopoverContent>
    </Popover>
  );
};