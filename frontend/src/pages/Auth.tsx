import React, { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, ArrowRight, KeyRound } from 'lucide-react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    otp: ''
  });
  
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (showOtp) {
        await authService.verifyOtp({ email: formData.email, otp: formData.otp });
        navigate('/');
        window.location.reload(); // Refresh to update auth state in App
      } else if (isLogin) {
        await authService.login({ email: formData.email, password: formData.password });
        navigate('/');
        window.location.reload();
      } else {
        const res = await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        if (res.next === 'verify_otp') {
          setShowOtp(true);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-height flex items-center justify-center p-6 bg-transparent">
      <div className="w-full max-w-md">
        <GlassCard className="transition-all duration-500">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">
                {showOtp ? 'Verify Email' : isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-400">
                {showOtp 
                  ? `Enter the OTP sent to ${formData.email}` 
                  : isLogin ? 'Enter your details to sign in' : 'Start your journey with Appointly'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.form
                key={showOtp ? 'otp' : (isLogin ? 'login' : 'signup')}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                className="flex flex-col gap-4"
                onSubmit={handleSubmit}
              >
                {showOtp ? (
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      name="otp"
                      placeholder="Enter 6-digit OTP" 
                      className="pl-10" 
                      required
                      value={formData.otp}
                      onChange={handleInputChange}
                    />
                  </div>
                ) : (
                  <>
                    {!isLogin && (
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                          type="text" 
                          name="name"
                          placeholder="Full Name" 
                          className="pl-10" 
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                        />
                      </div>
                    )}
                    
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                      <input 
                        type="email" 
                        name="email"
                        placeholder="Email Address" 
                        className="pl-10" 
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>

                    {!isLogin && (
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                          type="tel" 
                          name="phone"
                          placeholder="Phone Number" 
                          className="pl-10" 
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                      <input 
                        type="password" 
                        name="password"
                        placeholder="Password" 
                        className="pl-10" 
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary w-full justify-center text-lg mt-2 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (showOtp ? 'Verify OTP' : (isLogin ? 'Sign In' : 'Get Started'))}
                  {!loading && <ArrowRight size={20} />}
                </button>
              </motion.form>
            </AnimatePresence>

            {!showOtp && (
              <div className="text-center text-sm text-slate-400">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-indigo-400 font-semibold hover:underline bg-transparent border-none p-0 inline shrink-0"
                >
                  {isLogin ? 'Create one' : 'Sign in'}
                </button>
              </div>
            )}
            
            {showOtp && (
              <div className="text-center text-sm text-slate-400">
                <button 
                  onClick={() => setShowOtp(false)}
                  className="text-indigo-400 font-semibold hover:underline bg-transparent border-none p-0 inline shrink-0"
                >
                  Back to {isLogin ? 'Login' : 'Signup'}
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
