
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface AdminAccessToggleProps {
  adminId: string;
  adminEmail: string;
  adminDisplayName?: string;
  adminAvatarUrl?: string;
  currentAccessLevel: 'full' | 'partial';
  onAccessLevelChange: () => void;
}

export const AdminAccessToggle: React.FC<AdminAccessToggleProps> = ({
  adminId,
  adminEmail,
  adminDisplayName,
  adminAvatarUrl,
  currentAccessLevel,
  onAccessLevelChange
}) => {
  const [updating, setUpdating] = useState(false);
  const [accessLevel, setAccessLevel] = useState(currentAccessLevel);

  const updateAccessLevel = async (newLevel: 'full' | 'partial') => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          metadata: { 
            access_level: newLevel 
          } 
        })
        .eq('id', adminId);

      if (error) throw error;

      setAccessLevel(newLevel);
      onAccessLevelChange();
      toast({
        title: "Success",
        description: `Admin access level updated to ${newLevel}`,
      });
    } catch (error) {
      console.error('Error updating access level:', error);
      toast({
        title: "Error",
        description: "Failed to update access level",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage 
                src={adminAvatarUrl} 
                alt={adminDisplayName || adminEmail}
                className="object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {adminDisplayName 
                  ? adminDisplayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : adminEmail.substring(0, 2).toUpperCase()
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-800">
                {adminDisplayName || 'Unknown User'}
              </p>
              <p className="text-sm text-slate-600 truncate">
                {adminEmail}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
                <Badge 
                  variant={accessLevel === 'full' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {accessLevel === 'full' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {accessLevel === 'full' ? 'Full Access' : 'Partial Access'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor={`access-${adminId}`} className="text-sm">
                Full Access
              </Label>
              <Switch
                id={`access-${adminId}`}
                checked={accessLevel === 'full'}
                onCheckedChange={(checked) => 
                  updateAccessLevel(checked ? 'full' : 'partial')
                }
                disabled={updating}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-slate-600">
          {accessLevel === 'full' 
            ? 'Can view all form fields including sensitive information'
            : 'Cannot view sensitive information in submissions'
          }
        </div>
      </CardContent>
    </Card>
  );
};
