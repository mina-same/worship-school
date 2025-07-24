import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Save } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, updateEmail } = useAuth();
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail === user?.email) {
      return;
    }

    setLoading(true);
    try {
      await updateEmail(newEmail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">الملف الشخصي</h1>
        <p className="text-muted-foreground mt-2">إدارة معلومات حسابك الشخصي</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            معلومات الحساب
          </CardTitle>
          <CardDescription>
            يمكنك تحديث بريدك الإلكتروني في أي وقت
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-email" className="text-slate-700 font-medium">
                البريد الإلكتروني الحالي
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="current-email"
                  type="email" 
                  value={user?.email || ''}
                  disabled
                  className="pl-10 h-12 bg-muted border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-slate-700 font-medium">
                البريد الإلكتروني الجديد
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="new-email"
                  type="email" 
                  placeholder="أدخل البريد الإلكتروني الجديد"
                  className="pl-10 h-12 border-slate-200 focus:border-primary focus:ring-primary"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={loading || newEmail === user?.email || !newEmail}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  جاري التحديث...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  تحديث البريد الإلكتروني
                </div>
              )}
            </Button>
          </form>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">ملاحظة مهمة:</h4>
            <p className="text-sm text-blue-800">
              عند تحديث البريد الإلكتروني، ستحتاج إلى تأكيد التغيير من خلال الروابط المرسلة إلى كل من البريد القديم والجديد.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;