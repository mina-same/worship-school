import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserAvatar: React.FC = () => {
  const { user, userProfile } = useAuth();

  if (!user) return null;

  const getDisplayName = () => {
    return userProfile?.display_name || user.email?.split('@')[0] || 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
      <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-colors">
        <AvatarImage 
          src={userProfile?.avatar_url} 
          alt={getDisplayName()}
          className="object-cover"
        />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {userProfile?.avatar_url ? <User className="h-5 w-5" /> : getInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="hidden md:block text-right">
        <p className="text-sm font-medium text-foreground">{getDisplayName()}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
    </Link>
  );
};

export default UserAvatar;