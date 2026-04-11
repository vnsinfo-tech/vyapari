import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function PermissionRoute({ permission, children }) {
  const { isOwner, permissions, loaded } = useSelector(s => s.permissions);

  const denied = loaded && !isOwner && permissions && !permissions[permission];

  useEffect(() => {
    if (denied) toast.error("You don't have permission to access this page");
  }, [denied]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (isOwner || !permissions) return children;

  if (!permissions[permission]) return <Navigate to="/dashboard" replace />;

  return children;
}
