import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUser } from '../api/client';
import './Signup.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z가-힣]+(?:\s+[a-zA-Z가-힣]+)*$/;

function getEmailFormatError(email) {
  const value = email.trim();
  if (!value) return '';

  if (!value.includes('@')) {
    return `이메일 주소에 '@'를 포함해 주세요. '${value}'에 '@'가 없습니다.`;
  }

  if (!EMAIL_REGEX.test(value)) {
    return '올바른 이메일 형식이 아닙니다. (예: name@company.com)';
  }

  return '';
}

function getNameFormatError(name) {
  const value = name.trim();
  if (!value) return '';

  if (!NAME_REGEX.test(value)) {
    return '이름에는 한글 또는 영문만 입력할 수 있습니다. (숫자/특수문자 불가)';
  }

  return '';
}

function isDuplicateEmailError(error) {
  if (!error) return false;
  if (error.status === 409) return true;
  return String(error.message || '').includes('이미 가입된 이메일');
}

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    address: '',
    agree: false,
  });
  const [touched, setTouched] = useState({});
  const [emailDuplicate, setEmailDuplicate] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailFormatError = getEmailFormatError(form.email);
  const nameFormatError = getNameFormatError(form.name);

  const passwordLengthInvalid =
    form.password.length > 0 &&
    (form.password.length < 8 || form.password.length > 16);

  const passwordMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  const emailEmptyError =
    touched.email && !form.email.trim() ? '이메일을 입력해 주세요.' : '';
  const passwordEmptyError =
    touched.password && !form.password ? '비밀번호를 입력해 주세요.' : '';
  const passwordConfirmEmptyError =
    touched.passwordConfirm && !form.passwordConfirm
      ? '비밀번호를 다시 입력해 주세요.'
      : '';
  const nameEmptyError =
    touched.name && !form.name.trim() ? '이름을 입력해 주세요.' : '';

  const emailError =
    emailEmptyError ||
    (form.email.trim() && emailFormatError) ||
    (emailDuplicate ? '이미 가입된 이메일입니다.' : '');

  const passwordError =
    passwordEmptyError ||
    (passwordLengthInvalid ? '비밀번호는 8~16자를 입력해주세요' : '');

  const passwordConfirmError =
    passwordConfirmEmptyError ||
    (passwordMismatch ? '비밀번호가 일치하지 않아요' : '');

  const nameError =
    nameEmptyError || (form.name.trim() && nameFormatError) || '';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'email') {
      setEmailDuplicate(false);
      setSubmitError('');
    }
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setEmailDuplicate(false);

    setTouched({
      email: true,
      password: true,
      passwordConfirm: true,
      name: true,
      agree: true,
    });

    if (
      !form.email.trim() ||
      !form.name.trim() ||
      !form.password ||
      !form.passwordConfirm
    ) {
      setSubmitError('필수 항목을 모두 입력해 주세요.');
      return;
    }

    if (
      emailFormatError ||
      nameFormatError ||
      passwordLengthInvalid ||
      passwordMismatch
    ) {
      return;
    }

    if (!form.agree) {
      setSubmitError('약관에 동의해 주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // 서버에서 기존 회원 이메일 확인 후 저장 (중복이면 409)
      await createUser({
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        user_type: 'customer',
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
      });

      alert('회원가입이 완료되었습니다.');
      navigate('/');
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        setEmailDuplicate(true);
        setSubmitError('이미 가입된 이메일입니다.');
      } else {
        setSubmitError(error.message || '회원가입에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup">
      <header className="signup-header">
        <Link to="/" className="signup-back" aria-label="뒤로가기">
          ‹
        </Link>
        <h1 className="signup-title">가입하기</h1>
      </header>

      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        <div className={`signup-field ${emailError ? 'is-error' : ''}`}>
          <input
            type="text"
            name="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="이메일 입력"
            autoComplete="email"
            inputMode="email"
          />
          {emailError && <p className="signup-error">{emailError}</p>}
        </div>

        <div className={`signup-field ${passwordError ? 'is-error' : ''}`}>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="비밀번호 입력"
            autoComplete="new-password"
          />
          {passwordError && <p className="signup-error">{passwordError}</p>}
        </div>

        <div
          className={`signup-field ${passwordConfirmError ? 'is-error' : ''}`}
        >
          <input
            type="password"
            name="passwordConfirm"
            value={form.passwordConfirm}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="비밀번호 재입력"
            autoComplete="new-password"
          />
          {passwordConfirmError && (
            <p className="signup-error">{passwordConfirmError}</p>
          )}
        </div>

        <div className={`signup-field ${nameError ? 'is-error' : ''}`}>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="이름 입력"
            autoComplete="name"
          />
          {nameError && <p className="signup-error">{nameError}</p>}
        </div>

        <div className="signup-optional">
          <h2 className="signup-optional-title">주소 입력 (선택사항)</h2>
          <p className="signup-optional-desc">
            주소를 입력해주시면 배송에 활용할 수 있어요!
          </p>
          <div className="signup-field signup-field--boxed">
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="주소 입력"
              autoComplete="street-address"
            />
          </div>
        </div>

        <label className="signup-agree">
          <input
            type="checkbox"
            name="agree"
            checked={form.agree}
            onChange={handleChange}
          />
          <span>약관 전체동의</span>
        </label>

        {submitError && <p className="signup-submit-error">{submitError}</p>}

        <button type="submit" className="signup-submit" disabled={submitting}>
          {submitting ? '가입 중...' : '가입하기'}
        </button>
      </form>
    </div>
  );
}

export default Signup;
