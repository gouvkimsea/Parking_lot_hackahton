import React, { useEffect, useState } from 'react';
import { ShieldAlert, UserCheck, UserPlus, X } from 'lucide-react';
import { PROTOTYPE_DEMO_PASSWORDS } from '../data/communitySeedData';
import {
  validateLoginInput,
  validateRegistrationInput,
} from '../utils/communityLogic';

interface AuthModalProps {
  isOpen: boolean;
  reasonMessage?: string | null;
  onClose: () => void;
  onLogin: (email: string, password: string) => { ok: boolean; error?: string };
  onRegister: (
    name: string,
    email: string,
    password: string
  ) => { ok: boolean; error?: string };
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  reasonMessage,
  onClose,
  onLogin,
  onRegister,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setFormError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mode === 'login') {
      const validation = validateLoginInput({ email, password });
      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }
      const res = onLogin(email, password);
      if (!res.ok) {
        setFormError(res.error ?? 'Unable to sign in.');
      }
      return;
    }

    const validation = validateRegistrationInput({
      name,
      email,
      password,
      confirmPassword,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    const res = onRegister(name, email, password);
    if (!res.ok) {
      setFormError(res.error ?? 'Unable to create account.');
    }
  };

  const handleDemoSignIn = (demoEmail: string, demoPassword: string) => {
    setFormError(null);
    setErrors({});
    const res = onLogin(demoEmail, demoPassword);
    if (!res.ok) {
      setFormError(res.error ?? 'Demo login unavailable.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#141517]/50 backdrop-blur-[2px] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-[26px] shadow-[0_24px_64px_rgba(20,21,23,0.22)] border border-black/[0.06] overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#F0F1F3] flex items-center justify-between gap-3">
          <div>
            <h2
              id="auth-modal-title"
              className="text-[18px] font-bold text-[#141517]"
            >
              {mode === 'login' ? 'Sign In to ParkEasy' : 'Create Contributor Account'}
            </h2>
            <p className="text-[12px] text-[#767B84] mt-0.5">
              Phnom Penh Community Contributions
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="w-10 h-10 rounded-full bg-[#F4F5F6] hover:bg-[#EAECEF] text-[#141517] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto clean-scroll">
          {reasonMessage && (
            <div className="rounded-2xl bg-[#F3FCE0] border border-[#C5EC45]/60 px-3.5 py-2.5 text-[12.5px] font-medium text-[#3F5A05]">
              {reasonMessage}
            </div>
          )}

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 bg-[#F4F5F6] rounded-full p-1 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setErrors({});
                setFormError(null);
              }}
              className={`min-h-[40px] rounded-full text-[13px] font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#141517] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#141517]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setErrors({});
                setFormError(null);
              }}
              className={`min-h-[40px] rounded-full text-[13px] font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#141517] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#141517]'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-[12px] font-semibold text-[#141517] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Sovann Pich"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                />
                {errors.name && (
                  <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                    {errors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-[12px] font-semibold text-[#141517] mb-1"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
              />
              {errors.email && (
                <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-[12px] font-semibold text-[#141517] mb-1"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="At least 6 characters"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
              />
              {errors.password && (
                <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                  {errors.password}
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-[12px] font-semibold text-[#141517] mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter password"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                />
                {errors.confirmPassword && (
                  <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {formError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700 font-medium"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13.5px] font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              {mode === 'login' ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In & Continue</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Continue</span>
                </>
              )}
            </button>
          </form>

          {/* Clearly Separated Prototype Demo Shortcuts */}
          <div className="rounded-2xl bg-[#F6F7F8] border border-black/[0.06] p-3.5 space-y-2.5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#525760] shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-[#525760] leading-relaxed">
                <strong className="text-[#141517]">Simulated Frontend Prototype:</strong>{' '}
                Accounts persist in browser storage. Use quick demo sign-in below or register a new account above.
              </p>
            </div>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="demo-user-signin"
                onClick={() =>
                  handleDemoSignIn(
                    'sokha@parkeasy.kh',
                    PROTOTYPE_DEMO_PASSWORDS.contributor
                  )
                }
                className="min-h-[38px] px-3 rounded-xl bg-white hover:bg-[#EEF2E6] border border-black/10 text-[11.5px] font-semibold text-[#141517] transition-colors"
              >
                Demo Contributor
              </button>
              <button
                type="button"
                data-testid="demo-admin-signin"
                onClick={() =>
                  handleDemoSignIn(
                    'admin@parkeasy.kh',
                    PROTOTYPE_DEMO_PASSWORDS.admin
                  )
                }
                className="min-h-[38px] px-3 rounded-xl bg-[#141517] hover:bg-[#2A2D32] text-[11.5px] font-semibold text-white transition-colors"
              >
                Demo Admin Moderator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
