import { useState, useRef } from 'react';
import { QrCode, Copy, Check, Download, Share2, X, ExternalLink } from 'lucide-react';
import { Modal } from './ui.jsx';

export function QRCodeModal({ open, onClose, match, matchId }) {
  const [copied, setCopied] = useState(false);
  const liveUrl = typeof window !== 'undefined' ? `${window.location.origin}/live/${matchId}` : '';
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(liveUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleWhatsApp = () => {
    const text = `🏏 Watch *${match?.name || 'Cricket Match'}* LIVE Ball-by-Ball!\n📲 Click link to watch live:\n${liveUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadQRPaste = () => {
    // Generate a printable ground poster with QR Code
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');

    // Navy & Emerald Ground Poster
    ctx.fillStyle = '#060d19';
    ctx.fillRect(0, 0, 600, 760);

    // Green Stadium header
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 0, 600, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIVE MATCH SCORE', 300, 50);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SCAN WITH ANY PHONE CAMERA TO WATCH LIVE', 300, 80);

    // Match title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(match?.name || 'Cricket Match', 300, 160);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${match?.format || 'Match'} · ${match?.overs || 20} Overs`, 300, 190);

    // White QR Box
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 140, 220, 320, 320, 16);
    ctx.fill();

    // Draw QR image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 155, 235, 290, 290);

      // Bottom instructions
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('⚡ Instant Live Ball-by-Ball Updates', 300, 580);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px sans-serif';
      ctx.fillText('No App Install Required · Works in Any Mobile Browser', 300, 612);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText(liveUrl, 300, 650);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('POWERED BY CRICKET SCORE APP', 300, 715);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(match?.name || 'Match').replace(/[^a-zA-Z0-9_-]/g, '_')}_Live_QR_Poster.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });
    };
    img.src = qrImgUrl;
  };

  return (
    <Modal open={open} onClose={onClose} title="Fan Live QR Code & Share Link">
      <div className="space-y-4 text-center">
        <p className="text-xs text-slate-500">
          Anyone can scan this QR code or click the link to watch live scores in real-time. <strong>No login required!</strong>
        </p>

        {/* QR Code Container */}
        <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500 bg-white p-3 shadow-md">
          <img
            src={qrImgUrl}
            alt="Live Match QR Code"
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>

        {/* Match Name */}
        <div>
          <h4 className="font-bold text-slate-900 text-sm">{match?.name}</h4>
          <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-sm mx-auto">{liveUrl}</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-outline flex items-center justify-center gap-1.5 text-xs font-bold py-2.5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-600" />}
            <span>{copied ? 'Link Copied!' : 'Copy Live Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="btn btn-green flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 bg-emerald-600 hover:bg-emerald-700"
          >
            <Share2 className="h-4 w-4" />
            <span>WhatsApp Share</span>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={handleDownloadQRPaste}
            className="btn btn-outline w-full flex items-center justify-center gap-2 border-slate-300 text-slate-800 hover:bg-slate-50 font-bold text-xs py-2.5"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Download Ground QR Poster (Print & Paste)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function roundRect(ctx, x, y, width, height, radius = 5) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
