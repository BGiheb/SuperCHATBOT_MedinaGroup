export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'SUB_ADMIN' | 'USER';
  name: string;
  createdAt?: string;
}