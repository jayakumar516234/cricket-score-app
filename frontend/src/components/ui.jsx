import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ChevronDown, Check, Loader2, Shield, ImagePlus, X } from 'lucide-react';

export const CricketBallIcon = ({ className = "w-10 h-10" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="cricketBallGrad" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="45%" stopColor="#dc2626" />
        <stop offset="85%" stopColor="#991b1b" />
        <stop offset="100%" stopColor="#5f0f0f" />
      </radialGradient>
      <filter id="ballGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7f1d1d" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Ball sphere */}
    <circle cx="50" cy="50" r="46" fill="url(#cricketBallGrad)" filter="url(#ballGlow)" />
    {/* Highlight shine */}
    <ellipse cx="38" cy="26" rx="16" ry="10" transform="rotate(-30 38 26)" fill="white" fillOpacity="0.28" />
    
    {/* Cricket Ball Center Seam */}
    <path
      d="M50 4 C 62 28, 62 72, 50 96"
      stroke="#fef08a"
      strokeWidth="3.2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 4 C 38 28, 38 72, 50 96"
      stroke="#b91c1c"
      strokeWidth="1.2"
      fill="none"
      opacity="0.6"
    />
    
    {/* Seam stitches */}
    <path
      d="M44 14 L56 16 M47 24 L59 26 M49 35 L61 37 M50 47 L62 49 M49 59 L61 61 M47 71 L59 73 M44 82 L56 84"
      stroke="#ffffff"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const Spinner = ({ label = 'Loading...', size = 'default' }) => {
  const isSmall = size === 'sm';

  if (isSmall) {
    return (
      <div className="inline-flex items-center gap-2 text-slate-500" role="status">
        <div className="cricket-ball-spin shrink-0">
          <CricketBallIcon className="h-5 w-5" />
        </div>
        {label && <span className="text-xs font-medium">{label}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 select-none" role="status">
      <div className="relative flex flex-col items-center justify-center h-24 w-32">
        {/* Animated Cricket Ball */}
        <div className="cricket-ball-bounce z-10 flex items-center justify-center">
          <div className="cricket-ball-spin">
            <CricketBallIcon className="h-12 w-12 drop-shadow-md" />
          </div>
        </div>
        
        {/* Pitch ground line & ball shadow */}
        <div className="absolute bottom-2 flex flex-col items-center">
          {/* Dynamic shadow */}
          <div className="cricket-ball-shadow h-2.5 w-10 rounded-full bg-slate-400/40 blur-[1.5px]" />
          {/* Turf / crease accent line */}
          <div className="mt-1 flex items-center gap-1">
            <span className="h-1 w-2 rounded-full bg-pitch-500/60" />
            <span className="h-1 w-12 rounded-full bg-pitch-600 shadow-sm" />
            <span className="h-1 w-2 rounded-full bg-pitch-500/60" />
          </div>
        </div>
      </div>

      {/* Label with bouncing dots */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-semibold tracking-wide text-slate-700">{label}</span>
        <span className="inline-flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pitch-600 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600" />
        </span>
      </div>
    </div>
  );
};

export const ErrorBox = ({ message, onRetry }) =>
  message ? (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Try again</button>}
    </div>
  ) : null;

export const Empty = ({ icon: Icon = Shield, title, text, action }) => (
  <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <Icon className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
    <h3 className="font-semibold text-slate-700">{title}</h3>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:pb-5 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel, children }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      {children}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export const Field = ({ label, error, required, hint, children, htmlFor }) => (
  <div>
    <label className="label" htmlFor={htmlFor}>{label}{required && <span className="text-red-500"> *</span>}</label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
  </div>
);

export function TeamLogo({ team, size = 40 }) {
  const style = { width: size, height: size };
  if (team?.logo) return <img src={team.logo} alt="" style={style} className="shrink-0 rounded-lg bg-slate-100 object-cover" />;
  const initials = (team?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ ...style, fontSize: size * 0.38 }} className="flex shrink-0 items-center justify-center rounded-lg bg-navy-700 font-bold text-pitch-400" aria-hidden>
      {initials}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return total ? <p className="mt-3 text-center text-xs text-slate-500">{total} result{total === 1 ? '' : 's'}</p> : null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>Page {page} of {pages} ({total} total)</span>
      <div className="flex gap-2">
        <button className="btn btn-outline !px-3 !py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn btn-outline !px-3 !py-1.5" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  live: 'bg-red-100 text-red-700',
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  abandoned: 'bg-slate-200 text-slate-600',
};
export const StatusBadge = ({ status }) => (
  <span className={`badge capitalize ${STATUS_STYLES[status] || STATUS_STYLES.scheduled}`}>
    {status === 'live' && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />}
    {status}
  </span>
);

/** Resizes a picked image in the browser so only a small data URL is sent to the server. */
export function resizeImage(file, max = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ImagePicker({ value, onChange, label = 'Add image', size = 72, round }) {
  const ref = useRef();
  const [err, setErr] = useState('');
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setErr(''); onChange(await resizeImage(f)); } catch (x) { setErr(x.message); }
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current.click()} style={{ width: size, height: size }} className={`flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-400 ${round ? 'rounded-full' : 'rounded-xl'}`} aria-label={label}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
      </button>
      <div className="text-xs text-slate-500">
        <button type="button" onClick={() => ref.current.click()} className="font-semibold text-blue-600 hover:underline">{value ? 'Change' : label}</button>
        {value && <button type="button" onClick={() => onChange('')} className="ml-3 text-slate-500 hover:text-red-600">Remove</button>}
        {err && <p className="text-red-600">{err}</p>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
 
export function DropdownSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  disabled = false,
  className = '',
  error = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null ? opt : { value: opt, label: String(opt) }
  );

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`input flex w-full items-center justify-between text-left ${error ? 'input-error' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${!selectedOption && (value === '' || value === undefined) ? 'text-slate-400' : 'text-slate-900 font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {placeholder && (
            <div
              onClick={() => { onChange(''); setOpen(false); }}
              className="cursor-pointer px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
            >
              {placeholder}
            </div>
          )}
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={String(opt.value)}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition ${
                  isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && <span className="badge bg-blue-100 text-blue-700 text-[10px]">{opt.badge}</span>}
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

