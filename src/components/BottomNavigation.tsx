import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  Plus,
  List,
  UserCheck,
  Shield,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: string;
}

const BottomNavigation: React.FC = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const effectiveUserRole = userRole || 'user';

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        id: 'dashboard',
        title: 'Home',
        icon: Home,
        path: '/dashboard',
      },
      {
        id: 'profile',
        title: 'Profile',
        icon: User,
        path: '/profile',
      },
    ];

    if (effectiveUserRole === 'admin') {
      return [
        baseItems[0], // Dashboard
        {
          id: 'admin',
          title: 'Admin',
          icon: Shield,
          path: '/admin-assignments',
        },
        baseItems[1], // Profile
      ];
    }

    if (effectiveUserRole === 'super_admin') {
      return [
        baseItems[0], // Dashboard
        {
          id: 'forms',
          title: 'Forms',
          icon: FileText,
          path: '/super-admin/forms',
        },
        {
          id: 'admin',
          title: 'Admin',
          icon: Shield,
          path: '/admin-assignments',
        },
        baseItems[1], // Profile
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  // Only show on mobile devices
  if (window.innerWidth >= 768) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      {/* Safe area padding for iOS devices */}
      <div className="pb-safe-or-0">
        <div className="flex justify-around items-center px-2 py-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px]",
                  active
                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 mb-1" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium truncate max-w-full">
                  {item.title}
                </span>
              </button>
            );
          })}
          
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center justify-center py-2 px-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all duration-200 min-h-[44px] min-w-[44px]"
          >
            <LogOut className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
