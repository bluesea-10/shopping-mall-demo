import { useEffect, useState } from 'react';
import { getMe, getStoredToken } from '../api/client';
import { clearAuthStorage } from '../utils/authStorage';

export function useAuthUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    getMe()
      .then((data) => {
        if (!cancelled) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthStorage();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = () => {
    clearAuthStorage();
    setUser(null);
  };

  return {
    user,
    loading,
    isLoggedIn: Boolean(user),
    isAdmin: user?.user_type === 'admin',
    logout,
  };
}
