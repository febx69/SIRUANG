import { useState, useEffect } from "react";

export interface User {
  username: string;
  role: 'admin' | 'user';
}

const defaultUsers = [
  { username: 'admin', password: 'admin', role: 'admin' as const },
  { username: 'user', password: 'user', role: 'user' as const }
];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    const foundUser = defaultUsers.find(
      u => u.username === username && u.password === password
    );
    
    if (foundUser) {
      const userData: User = { username: foundUser.username, role: foundUser.role };
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return {
    user,
    login,
    logout,
    isLoading
  };
};