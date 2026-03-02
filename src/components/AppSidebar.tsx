import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  Plus,
  Edit,
  List,
  UserCheck,
  Shield,
  BookOpen,
  User,
} from 'lucide-react';

interface SubMenuItem {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
  isActive: boolean;
}

interface MenuItemWithItems {
  title: string;
  icon: React.ComponentType<any>;
  items: SubMenuItem[];
}

interface MenuItemWithPath {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
  isActive: boolean;
}

type MenuItem = MenuItemWithItems | MenuItemWithPath;

const AppSidebar: React.FC = () => {
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

  const getUserMenuItems = () => {
    const baseItems = [
      {
        title: 'Dashboard',
        icon: Home,
        path: '/dashboard',
        isActive: isActive('/dashboard'),
      },
    ];

    if (effectiveUserRole === 'user') {
      return baseItems;
    }

    if (effectiveUserRole === 'admin') {
      return [
        ...baseItems,
        {
          title: 'Admin',
          icon: Shield,
          items: [
            {
              title: 'Assignments',
              icon: List,
              path: '/admin-assignments',
              isActive: isActive('/admin-assignments'),
            },
            {
              title: 'User Management',
              icon: Users,
              path: '/admin/user-management',
              isActive: isActive('/admin/user-management'),
            },
          ],
        },
      ];
    }

    if (effectiveUserRole === 'super_admin') {
      return [
        ...baseItems,
        {
          title: 'Forms',
          icon: FileText,
          items: [
            {
              title: 'All Forms',
              icon: List,
              path: '/super-admin/forms',
              isActive: isActive('/super-admin/forms'),
            },
            {
              title: 'Create Form',
              icon: Plus,
              path: '/form-builder',
              isActive: isActive('/form-builder'),
            },
          ],
        },
        {
          title: 'Admin',
          icon: Shield,
          items: [
            {
              title: 'Assignments',
              icon: List,
              path: '/admin-assignments',
              isActive: isActive('/admin-assignments'),
            },
            {
              title: 'User Management',
              icon: Users,
              path: '/admin/user-management',
              isActive: isActive('/admin/user-management'),
            },
            {
              title: 'Super Admin Users',
              icon: UserCheck,
              path: '/super-admin/user-management',
              isActive: isActive('/super-admin/user-management'),
            },
          ],
        },
      ];
    }

    return baseItems;
  };

  const menuItems = getUserMenuItems();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-2 p-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              School of Worship
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {effectiveUserRole?.replace('_', ' ').toUpperCase()}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {'items' in item ? (
                    <>
                      <SidebarMenuButton>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              onClick={() => handleNavigation(subItem.path)}
                              isActive={subItem.isActive}
                            >
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.path)}
                      isActive={item.isActive}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation('/profile')}>
              <User className="h-4 w-4" />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
