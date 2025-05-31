
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface AdminAccessToggleProps {
  adminId: string;
  adminEmail: string;
  currentAccessLevel: 'full' | 'partial';
  onAccessLevelChange: () => void;
}

export const AdminAccessToggle: React.FC<AdminAccessToggleProps> = ({
  adminId,
  adminEmail,
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
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
              {adminEmail.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-slate-800">{adminEmail}</p>
              <div className="flex items-center gap-2">
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
