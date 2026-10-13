import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDot, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, Field } from '../components/ui.jsx';

const digits = (v) => v.replace(/\D/g, '');

export default function Register() {
  const { register } = useAuth();
  const [f, setF] = useState({ name: '', username: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter your name';
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(f.username) || !/[a-zA-Z]/.test(f.username)) er.username = '3-30 characters: letters, numbers, dot or underscore (at least one letter)';
    let p = digits(f.phone);
    if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
    if (!/^[6-9]\d{9}$/.test(p)) er.phone = 'Enter a valid 10-digit mobile number';
    if (f.password.length < 6) er.password = 'Use at least 6 characters';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError('');
    try {
      await register(f.name.trim(), f.username.trim(), p, f.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 p-4">
      <div className="mb-6 flex flex-col items-center text-white">
        <CircleDot className="mb-2 h-12 w-12 text-pitch-400" aria-hidden />
        <h1 className="text-2xl font-extrabold">Create your account</h1>
        <p className="text-center text-sm text-slate-300">Add your team, create matches and update the live score</p>
      </div>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <ErrorBox message={error} />
        <Field label="Your name" required error={errors.name} htmlFor="name"><input id="name" className={`input ${errors.name ? 'input-error' : ''}`} value={f.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Username" required error={errors.username} htmlFor="username" hint="You can log in with this or your phone number">
          <input id="username" autoCapitalize="none" className={`input ${errors.username ? 'input-error' : ''}`} value={f.username} onChange={set('username')} autoComplete="username" />
        </Field>
        <Field label="Phone number" required error={errors.phone} htmlFor="phone">
          <input id="phone" type="tel" inputMode="numeric" className={`input ${errors.phone ? 'input-error' : ''}`} value={f.phone} onChange={set('phone')} placeholder="10-digit mobile number" autoComplete="tel" />
        </Field>
        <Field label="Password" required error={errors.password} htmlFor="rpass"><input id="rpass" type="password" className={`input ${errors.password ? 'input-error' : ''}`} value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign up</button>
        <p className="text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-blue-600 hover:underline">Login</Link></p>
      </form>
    </div>
  );
}
