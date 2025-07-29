
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Copy, Link, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AdminInviteLink: React.FC = () => {
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateInviteLink = () => {
    if (!user?.id) return;
    
    setIsGenerating(true);
    // Generate a unique invite link with the admin's ID
    const baseUrl = window.location.origin;
    const inviteCode = btoa(user.id); // Base64 encode the admin ID
    const link = `${baseUrl}/invite/${inviteCode}`;
    
    setInviteLink(link);
    setIsGenerating(false);
    
    toast({
      title: "Invite Link Generated",
      description: "Share this link with users you want to assign to yourself.",
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Link Copied",
        description: "Invite link has been copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-green-600" />
          </div>
          User Invitation
        </CardTitle>
        <p className="text-slate-600">Generate a link to automatically assign users to yourself</p>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={generateInviteLink}
              disabled={isGenerating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Link className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Invite Link'}
            </Button>
          </div>
          
          {inviteLink && (
            <div className="space-y-2">
              <Label htmlFor="invite-link">Your Invite Link</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="invite-link"
                  value={inviteLink}
                  readOnly
                  className="font-mono text-sm flex-1"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="icon"
                  className="sm:flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-600">
                When users visit this link and sign up, they will be automatically assigned to you.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminInviteLink;
