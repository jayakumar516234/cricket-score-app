import { Navigate } from 'react-router-dom';

// Public signup is disabled; redirect to login
export default function Register() {
  return <Navigate to="/login" replace />;
}
