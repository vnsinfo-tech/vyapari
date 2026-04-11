import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api/services';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Forgot Password</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your email to receive a reset link</p>
        {sent ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">Reset link sent to {email}</p>
            <Link to="/login" className="text-primary-600 text-sm mt-4 block hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required placeholder="you@business.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending...' : 'Send Reset Link'}</button>
            <Link to="/login" className="block text-center text-sm text-gray-500 hover:underline">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
