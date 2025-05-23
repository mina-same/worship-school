
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Copy, Share2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ShareFormButtonProps {
  formId: string;
}

export const ShareFormButton: React.FC<ShareFormButtonProps> = ({ formId }) => {
  const [open, setOpen] = useState(false);
  const shareUrl = `${window.location.origin}/form/${formId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "The form link has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" /> Share Form
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Form Link</DialogTitle>
          <DialogDescription>
            Anyone with this link can access and submit this form.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <Input
            value={shareUrl}
            readOnly
            className="flex-1"
          />
          <Button onClick={copyToClipboard} size="icon" variant="outline">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
