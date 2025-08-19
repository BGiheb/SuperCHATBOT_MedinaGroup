import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Palette, Bell, Shield, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
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
  const { theme } = useTheme();
  const { toast } = useToast();

  // Fetch authenticated user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          toast({
            title: 'Authentication Error',
            description: 'No authentication token found',
            variant: 'destructive',
          });
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
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
  }, []);

  // Handle input changes for user data
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setUserData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle input changes for password fields
  const handlePasswordChange = (e) => {
    const { id, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle save action for user data (name, email, role)
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        toast({
          title: 'Authentication Error',
          description: 'No authentication token found',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (!userData.id) {
        console.error('User ID not available');
        toast({
          title: 'Error',
          description: 'User ID not available',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
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
        throw new Error(errorData.message || 'Failed to update user data');
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

  // Handle password change action
  const handleChangePassword = async () => {
    setIsLoading(true);
    try {
      const { oldPassword, newPassword, confirmPassword } = passwordData;

      // Validate inputs
      if (!oldPassword || !newPassword || !confirmPassword) {
        toast({
          title: 'Validation Error',
          description: 'All password fields are required',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: 'Validation Error',
          description: 'New password and confirm password do not match',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        toast({
          title: 'Validation Error',
          description: 'New password must be at least 8 characters long',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        toast({
          title: 'Authentication Error',
          description: 'No authentication token found',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
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
        throw new Error(errorData.message || 'Failed to change password');
      }

      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully',
      });

      // Clear password fields
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
      {/* Header */}
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

      {/* Account Settings */}
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
        </div>
      </motion.div>

      {/* Appearance Settings */}
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

      {/* Notifications */}
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

      {/* Security */}
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

      {/* Save Button for User Data */}
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