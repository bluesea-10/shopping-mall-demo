import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMe, getStoredToken, loginUser } from '../api/client';
import { clearAuthStorage } from '../utils/authStorage';
import './Login.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function Login() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(Boolean(getStoredToken()));
  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: true,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setCheckingAuth(false);
      return;
    }

    let cancelled = false;

    getMe()
      .then(() => {
        if (!cancelled) {
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthStorage();
          setCheckingAuth(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const email = form.email.trim();
    const password = form.password;

    if (!email) {
      setError('이메일을 입력해 주세요.');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setError('올바른 이메일 형식이 아닙니다. (예: name@company.com)');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // POST /api/auth/login → userController.login
      const data = await loginUser({ email, password });

      if (!data.token) {
        throw new Error('로그인 토큰을 받지 못했습니다.');
      }

      const storage = form.remember ? localStorage : sessionStorage;
      const otherStorage = form.remember ? sessionStorage : localStorage;

      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));
      otherStorage.removeItem('token');
      otherStorage.removeItem('user');

      alert(data.message || '로그인에 성공했습니다.');
      navigate('/');
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return <div className="login-page" />;
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 19.5c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8" />
          </svg>
        </div>

        <label className="login-field">
          <span className="login-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" />
            </svg>
          </span>
          <input
            type="text"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email ID"
            autoComplete="email"
            inputMode="email"
          />
        </label>

        <label className="login-field">
          <span className="login-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            autoComplete="current-password"
          />
        </label>

        <div className="login-options">
          <label className="login-remember">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            <span>로그인 유지</span>
          </label>
          <button type="button" className="login-forgot">
            비밀번호 찾기
          </button>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? 'LOGIN...' : 'LOGIN'}
        </button>

        <p className="login-footer">
          Don&apos;t have an account? <Link to="/signup">Signup</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
