import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Palette, Bell, Shield, Save, Lock, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlatformName } from '@/contexts/PlatformNameContext';
import { usePlatformLogo } from '@/contexts/PlatformLogoContext';
import ThemeToggle from '@/components/settings/ThemeToggle';
import ColorPicker from '@/components/settings/ColorPicker';
import { useToast } from '@/components/ui/use-toast';

const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({ id: null, name: '', email: '', role: '' });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { theme } = useTheme();
  const { platformName, setPlatformName } = usePlatformName();
  const { platformLogo, setPlatformLogo } = usePlatformLogo();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.statusText}`);
        }

        const data = await response.json();
        setUserData({ id: data.id, name: data.name || '', email: data.email || '', role: data.role || '' });
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Fetch Error',
          description: error.message || 'Failed to fetch user data',
          variant: 'destructive',
        });
      }
    };

    fetchUserData();
  }, [toast]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Only PNG, JPEG, or SVG files are allowed',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast({
        title: 'Error',
        description: 'No file selected',
        variant: 'destructive',
      });
      return;
    }
  
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      const formData = new FormData();
      formData.append('logo', logoFile);
  
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/platform/logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      if (!response.ok) {
        let errorMessage = `Failed to upload logo: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
  
      const data = await response.json();
      console.log('Cloudinary logoUrl:', data.logoUrl); // Debug log
      setPlatformLogo(data.logoUrl);
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: 'Success',
        description: 'Platform logo uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/platform/logo`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        let errorMessage = `Failed to delete logo: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
  
      setPlatformLogo(null);
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: 'Success',
        description: 'Platform logo deleted successfully. Reverted to default.',
      });
  
      // Force favicon update by refreshing the context
      const { refreshPlatformLogo } = usePlatformLogo();
      await refreshPlatformLogo();
      console.log('Favicon should revert to default SVG after delete');
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: 'Delete Error',
        description: error.message || 'Failed to delete logo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setUserData((prev) => ({ ...prev, [id]: value }));
  };

  const handlePlatformNameChange = (e) => {
    setPlatformName(e.target.value);
  };

  const handlePasswordChange = (e) => {
    const { id, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!userData.id) {
        throw new Error('User ID not available');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: userData.name, email: userData.email, role: userData.role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update user data: ${response.statusText}`);
      }

      toast({
        title: 'Update Successful',
        description: 'User data updated successfully',
      });
    } catch (error) {
      console.error('Error updating user data:', error);
      toast({
        title: 'Update Error',
        description: error.message || 'Failed to update user data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setIsLoading(true);
    try {
      const { oldPassword, newPassword, confirmPassword } = passwordData;

      if (!oldPassword || !newPassword || !confirmPassword) {
        throw new Error('All password fields are required');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirm password do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to change password: ${response.statusText}`);
      }

      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully',
      });

      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Password Change Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold gradient-text mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Account</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={userData.name}
              onChange={handleInputChange}
              className="bg-glass/50 border-glass-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={userData.email}
              onChange={handleInputChange}
              className="bg-glass/50 border-glass-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platformName">Platform Name</Label>
            <Input
              id="platformName"
              value={platformName}
              onChange={handlePlatformNameChange}
              className="bg-glass/50 border-glass-border"
              placeholder="Enter platform name"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="glass-card p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Platform Logo</h2>
        </div>

        <div className="space-y-4">
          {platformLogo ? (
            <div className="flex flex-col items-center space-y-4">
              <img src={platformLogo} alt="Current Logo" className="w-20 h-20 object-contain rounded" />
              <Button
                variant="destructive"
                onClick={handleDeleteLogo}
                disabled={isLoading}
              >
                Delete Logo (Revert to Default)
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Using default robot logo</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="logo">Upload New Logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoChange}
              className="bg-glass/50 border-glass-border"
            />
          </div>

          {logoPreview && (
            <div className="flex flex-col items-center space-y-4">
              <img src={logoPreview} alt="Logo Preview" className="w-20 h-20 object-contain rounded" />
              <Button
                onClick={handleUploadLogo}
                disabled={isLoading}
                className="bg-gradient-primary text-white"
              >
                Upload Logo
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Appearance</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Theme</h3>
              <p className="text-sm text-muted-foreground">
                Choose between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div>
            <h3 className="font-medium mb-3">Primary Color</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the accent color for your interface
            </p>
            <ColorPicker />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Email Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">New Conversations</h3>
              <p className="text-sm text-muted-foreground">
                Get notified when users start new conversations
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">System Updates</h3>
              <p className="text-sm text-muted-foreground">
                Notifications about system maintenance and updates
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Old Password</Label>
              <Input
                id="oldPassword"
                type="password"
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                className="bg-glass/50 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="bg-glass/50 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="bg-glass/50 border-glass-border"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isLoading}
              className="bg-gradient-primary hover:scale-105 transition-transform duration-200 text-white"
            >
              {isLoading ? (
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Change Password
            </Button>
          </div>

          <Button variant="outline" className="bg-glass/50 border-glass-border hover:bg-glass/80">
            Enable Two-Factor Authentication
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-gradient-primary hover:scale-105 transition-transform duration-200 text-white"
        >
          {isLoading ? (
            <motion.div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </motion.div>
    </div>
  );
};

export default Settings;