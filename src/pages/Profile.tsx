import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Save, Camera } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, userProfile, updateEmail, updateProfile, uploadAvatar } = useAuth();
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [displayName, setDisplayName] = useState(userProfile?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        display_name: displayName,
        avatar_url: userProfile?.avatar_url
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    setUploadingAvatar(true);
    try {
      const { url, error } = await uploadAvatar(file);
      if (error) throw error;
      
      if (url) {
        await updateProfile({
          display_name: displayName,
          avatar_url: url
        });
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getDisplayName = () => {
    return displayName || userProfile?.display_name || user?.email?.split('@')[0] || 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
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
            يمكنك تحديث صورتك الشخصية واسمك وبريدك الإلكتروني
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage 
                  src={userProfile?.avatar_url} 
                  alt={getDisplayName()}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {userProfile?.avatar_url ? <User className="h-8 w-8" /> : getInitials()}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            {uploadingAvatar && (
              <p className="text-sm text-muted-foreground">جاري رفع الصورة...</p>
            )}
          </div>

          {/* Profile Form */}
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-slate-700 font-medium">
                الاسم المعروض
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="display-name"
                  type="text" 
                  placeholder="أدخل اسمك المعروض"
                  className="pl-10 h-12 border-slate-200 focus:border-primary focus:ring-primary"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  جاري التحديث...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  حفظ الملف الشخصي
                </div>
              )}
            </Button>
          </form>

          {/* Email Update Form */}
          <form onSubmit={handleEmailUpdate} className="space-y-4 pt-4 border-t border-slate-200">
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
            <h4 className="font-medium text-blue-900 mb-2">ملاحظات مهمة:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• يمكنك رفع صورة شخصية بحد أقصى 5 ميجابايت</li>
              <li>• عند تحديث البريد الإلكتروني، ستحتاج إلى تأكيد التغيير</li>
              <li>• سيتم إرسال روابط التأكيد إلى البريد القديم والجديد</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;