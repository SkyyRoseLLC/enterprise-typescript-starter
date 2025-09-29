import type { User, CreateUserRequest } from '../../shared/types';

// Simple in-memory user store for demonstration
// In a real application, this would be replaced with a database model
class UserModel {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> id mapping

  constructor() {
    // Add a default demo user for testing
    const demoUser: User = {
      id: '1',
      email: 'demo@example.com',
      name: 'Demo User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);
    this.emailIndex.set(demoUser.email, demoUser.id);
  }

  async create(userData: CreateUserRequest & { id: string; hashedPassword: string }): Promise<User> {
    const { id, email, name, hashedPassword } = userData;
    
    if (this.emailIndex.has(email)) {
      throw new Error('Email already exists');
    }

    const user: User = {
      id,
      email,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store user (in real app, store hashedPassword too)
    this.users.set(id, user);
    this.emailIndex.set(email, id);
    
    // Store password separately (in real app, this would be in the same record)
    (this.users.get(id) as any).hashedPassword = hashedPassword;

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<(User & { hashedPassword: string }) | null> {
    const userId = this.emailIndex.get(email);
    if (!userId) return null;
    
    const user = this.users.get(userId);
    if (!user) return null;
    
    return {
      ...user,
      hashedPassword: (user as any).hashedPassword || '',
    };
  }

  async findAll(skip = 0, limit = 10): Promise<{ users: User[]; total: number }> {
    const allUsers = Array.from(this.users.values());
    const users = allUsers.slice(skip, skip + limit);
    return {
      users,
      total: allUsers.length,
    };
  }

  async update(id: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    // Check email uniqueness if email is being updated
    if (updates.email && updates.email !== user.email) {
      if (this.emailIndex.has(updates.email)) {
        throw new Error('Email already exists');
      }
      
      // Update email index
      this.emailIndex.delete(user.email);
      this.emailIndex.set(updates.email, id);
    }

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    this.users.delete(id);
    this.emailIndex.delete(user.email);
    return true;
  }

  async exists(email: string): Promise<boolean> {
    return this.emailIndex.has(email);
  }
}

export const userModel = new UserModel();