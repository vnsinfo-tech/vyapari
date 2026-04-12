import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../api/services';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
      toast.success('Password reset successful!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired link');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">V</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vyapari</h1>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your new password below</p>

        {done ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">✅ Password reset successful!</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="input"
                placeholder="Repeat password"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <Link to="/login" className="block text-center text-sm text-gray-500 hover:underline">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
