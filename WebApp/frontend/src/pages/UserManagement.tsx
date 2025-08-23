import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Edit,
  Trash,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUB_ADMIN' | 'USER';
  createdAt: string;
}

// Function to evaluate password strength
const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length > 0) strength += 1; // Any password
  if (password.length >= 8) strength += 1; // 8+ characters
  if (/[A-Z]/.test(password)) strength += 1; // Uppercase
  if (/[a-z]/.test(password)) strength += 1; // Lowercase
  if (/[0-9]/.test(password)) strength += 1; // Number
  if (/[^A-Za-z0-9]/.test(password)) strength += 1; // Special character

  if (strength <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
  if (strength <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
  return { label: 'Strong', color: 'bg-green-500', width: '100%' };
};

const fetchUsers = async (): Promise<User[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  const users = await response.json();
  return users.filter((user: User) => ['ADMIN', 'SUB_ADMIN'].includes(user.role));
};

const createSubAdmin = async (data: { name: string; email: string; password: string; role: 'ADMIN' | 'SUB_ADMIN' }) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/sub-admin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create user');
  return response.json();
};

const updateUser = async ({ id, data }: { id: number; data: { name: string; email: string; role: string } }) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update user');
  return response.json();
};

const changeUserPassword = async ({ id, newPassword }: { id: number; newPassword: string }) => {
  const token = localStorage.getItem('token');
  console.log('Sending password change request:', { id, newPassword }); // Debug log
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${id}/password`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newPassword }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to change password');
  }
  return response.json();
};

const deleteUser = async (id: number) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete user');
  return response.json();
};

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUB_ADMIN' as 'ADMIN' | 'SUB_ADMIN' | 'USER',
  });

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createSubAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'SUB_ADMIN' });
      toast({
        title: 'User Created',
        description: 'The user has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', password: '', role: 'SUB_ADMIN' });
      toast({
        title: 'User Updated',
        description: 'The user has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changeUserPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', password: '', role: 'SUB_ADMIN' });
      toast({
        title: 'Password Changed',
        description: 'The user password has been successfully changed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User Deleted',
        description: 'The user has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formData.name || !formData.email || !formData.role) {
      toast({
        title: 'Error',
        description: 'Name, email, and role are required',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate({ id: selectedUser.id, data: { name: formData.name, email: formData.email, role: formData.role } });
    if (formData.password || formData.password === '') {
      changePasswordMutation.mutate({ id: selectedUser.id, newPassword: formData.password });
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(id);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users: {(error as Error).message}</div>;

  return (
    <div className="container mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold gradient-text">User Management</h1>
          <Button
            className="bg-gradient-primary text-white"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>

        <Card className="glass-card p-6">
          {users?.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users?.map((user) => (
                <motion.div
                  key={user.id}
                  className="group hover-lift hover-glow"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="p-4 border-glass-border">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user.id)}
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">Role: {user.role === 'SUB_ADMIN' ? 'User' : user.role}</p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Create User Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="glass-card border-glass-border">
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as 'ADMIN' | 'SUB_ADMIN' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="SUB_ADMIN">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-primary text-white"
                  disabled={createMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="glass-card border-glass-border">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                {['ADMIN', 'SUB_ADMIN'].includes(selectedUser?.role) && (
                  <div>
                    <Label htmlFor="password">New Password (optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter new password"
                    />
                    {formData.password && (
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          Password Strength: {passwordStrength.label}
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full mt-1">
                          <div
                            className={cn('h-full rounded-full transition-all', passwordStrength.color)}
                            style={{ width: passwordStrength.width }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as 'ADMIN' | 'SUB_ADMIN' | 'USER' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="SUB_ADMIN">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-primary text-white"
                  disabled={updateMutation.isPending || changePasswordMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default UserManagement;