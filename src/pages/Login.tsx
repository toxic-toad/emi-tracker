import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Google, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function Login() {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setShowForgotPassword(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            EMI Tracker Pro
          </h1>
          <p className="text-slate-400">Track your loans efficiently</p>
        </div>

        <Card className="p-6">
          {!showForgotPassword ? (
            <>
              <Button
                onClick={handleGoogleLogin}
                loading={loading}
                icon={<Google size={20} />}
                className="w-full mb-4"
                variant="secondary"
              >
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">Or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={20} />}
                  required
                />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={20} />}
                  required
                />
                <Button
                  type="submit"
                  loading={loading}
                  icon={<ArrowRight size={20} />}
                  className="w-full"
                >
                  Sign In
                </Button>
              </form>

              <button
                onClick={() => setShowForgotPassword(true)}
                className="w-full mt-4 text-sm text-slate-400 hover:text-blue-400 transition-colors"
              >
                Forgot password?
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Reset Password</h2>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={20} />}
                required
              />
              <Button
                onClick={handleForgotPassword}
                loading={loading}
                className="w-full"
              >
                Send Reset Link
              </Button>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-sm text-slate-400 hover:text-blue-400 transition-colors"
              >
                Back to login
              </button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
