/**
 * Official Cricket Match Scorecard PDF Generator  v2
 * - Produces an official, high-resolution A4-sized PDF document.
 * - Works 100% client-side and offline on all devices (Android, iOS, PC, Mac).
 * - Formatted for official league records, tournaments, umpire/captain signatures.
 * - Improved design: richer colour palette, over-grid adapts rows like the live UI.
 */

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  navy:        '#0f172a',
  navyMid:     '#1e293b',
  navyLight:   '#334155',
  slate:       '#475569',
  slateLight:  '#64748b',
  muted:       '#94a3b8',
  line:        '#e2e8f0',
  lineMid:     '#cbd5e1',
  bg:          '#ffffff',
  bgAlt:       '#f8fafc',
  bgRow:       '#f1f5f9',
  emerald:     '#059669',
  emeraldDark: '#047857',
  emeraldBg:   '#ecfdf5',
  emeraldBorder:'#6ee7b7',
  red:         '#dc2626',
  redBg:       '#fee2e2',
  blue:        '#2563eb',
  blueBg:      '#dbeafe',
  amber:       '#d97706',
  amberBg:     '#fef3c7',
  purple:      '#7c3aed',
  purpleBg:    '#ede9fe',
  green:       '#16a34a',
  greenBg:     '#dcfce7',
};

export async function downloadScorecardPDF(view) {
  if (!view || !view.match) return;
  const { match, innings = [] } = view;
  const homeName = match.homeTeam?.name || 'Team 1';
  const awayName = match.awayTeam?.name || 'Team 2';

  // ── 1. Estimate total canvas height ────────────────────────────────────────
  const width = 860;
  const PAD = 28;         // left/right margin
  const innerW = width - PAD * 2;

  let estimatedHeight = 260; // header + result banner

  innings.forEach((inn) => {
    const state = inn.state || {};
    const batCount  = (state.battingCard  || []).length || 1;
    const bowlCount = (state.bowlingCard  || []).length || 1;
    const oversCount = (state.overSummary || []).length;

    // Over grid: same adaptive logic as the live UI
    const cols = oversCount <= 8 ? oversCount
               : oversCount <= 16 ? Math.ceil(oversCount / 2)
               : oversCount <= 24 ? Math.ceil(oversCount / 3)
               : Math.ceil(oversCount / 4);
    const gridCols = Math.max(cols, 1);
    const overRows = oversCount > 0 ? Math.ceil(oversCount / gridCols) : 0;

    estimatedHeight += 50;                      // innings header
    estimatedHeight += 30 + batCount * 28;      // batting table
    estimatedHeight += 56;                      // extras + fow
    estimatedHeight += 30 + bowlCount * 28;     // bowling table
    if (oversCount > 0) {
      estimatedHeight += 36 + overRows * 52;   // over grid
    }
    estimatedHeight += 36;                      // spacing
  });

  estimatedHeight += 190; // signatures + footer
  estimatedHeight += 60;  // bottom margin

  // ── 2. Canvas setup (2× retina) ────────────────────────────────────────────
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width  = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = PAD;

  // ── 3. TOP HEADER ──────────────────────────────────────────────────────────
  // Gradient-effect navy banner
  const hdrH = 112;
  ctx.fillStyle = C.navy;
  roundRect(ctx, PAD, y, innerW, hdrH, 14);
  ctx.fill();

  // Accent stripe at top of banner
  ctx.fillStyle = C.emerald;
  roundRect(ctx, PAD, y, innerW, 6, 14);
  ctx.fill();
  ctx.fillRect(PAD, y + 4, innerW, 4); // square bottom of stripe

  // App badge
  ctx.fillStyle = C.emeraldBg;
  roundRect(ctx, PAD + 16, y + 16, 260, 20, 4);
  ctx.fill();
  ctx.fillStyle = C.emeraldDark;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('🏏  CRICKET SCORE APP  ·  OFFICIAL MATCH RECORD', PAD + 24, y + 30);

  // Match title
  ctx.fillStyle = C.bg;
  ctx.font = 'bold 23px sans-serif';
  const matchTitle = match.name || `${homeName} vs ${awayName}`;
  ctx.fillText(matchTitle, PAD + 16, y + 62);

  // Meta line
  ctx.fillStyle = C.muted;
  ctx.font = '12px sans-serif';
  const metaParts = [
    match.format ? `${match.format} · ${match.overs} Overs` : `${match.overs} Overs Match`,
    match.ground ? `📍 ${match.ground}` : '',
    match.date   ? `📅 ${new Date(match.date).toLocaleDateString()}` : '',
  ].filter(Boolean);
  ctx.fillText(metaParts.join('   ·   '), PAD + 16, y + 86);

  // Tournament / series name
  if (match.tournamentName) {
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText(`🏆 ${match.tournamentName}`, PAD + 16, y + 103);
  }

  y += hdrH + 16;

  // ── 4. RESULT BANNER ───────────────────────────────────────────────────────
  if (match.status === 'abandoned') {
    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, PAD, y, innerW, 66, 10);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('⚠️  Match Abandoned', PAD + 16, y + 26);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Match was called off and saved with official records.', PAD + 16, y + 48);
    y += 82;
  } else if (match.result) {
    ctx.fillStyle = C.emeraldBg;
    roundRect(ctx, PAD, y, innerW, 66, 10);
    ctx.fill();
    ctx.strokeStyle = C.emeraldBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Left: result
    ctx.fillStyle = C.green;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`🏆  ${match.result.summary || 'Match Completed'}`, PAD + 16, y + 26);

    // Right: Player of Match
    if (match.playerOfMatch) {
      ctx.fillStyle = C.amber;
      ctx.font = 'bold 12px sans-serif';
      const pomText = `⭐ ${match.playerOfMatch.name}${match.playerOfMatch.summary ? '  (' + match.playerOfMatch.summary + ')' : ''}`;
      const pomW = ctx.measureText(pomText).width;
      ctx.fillText(pomText, PAD + innerW - pomW - 10, y + 26);
    }

    // Toss
    if (match.toss) {
      ctx.fillStyle = C.slateLight;
      ctx.font = '11px sans-serif';
      ctx.fillText(`Toss: ${match.toss.winnerName} won the toss · chose to ${match.toss.decision}`, PAD + 16, y + 48);
    }

    y += 82;
  }

  // ── 5. INNINGS ─────────────────────────────────────────────────────────────
  innings.forEach((inn, innIdx) => {
    const isHome    = inn.battingTeam === match.homeTeam?.id;
    const teamName  = isHome ? homeName : awayName;
    const state     = inn.state || {};
    const battingCard  = state.battingCard  || [];
    const bowlingCard  = state.bowlingCard  || [];
    const extras       = state.extras || { total: 0, wide: 0, noball: 0, bye: 0, legbye: 0 };
    const fow          = state.fow || [];
    const overSummary  = state.overSummary || [];

    // ── Innings header bar ──
    const innColor = innIdx === 0 ? '#1d4ed8' : '#7e22ce'; // blue / purple
    ctx.fillStyle = innColor;
    roundRect(ctx, PAD, y, innerW, 40, 10);
    ctx.fill();

    // Team name
    ctx.fillStyle = C.bg;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${innIdx === 0 ? '1st' : '2nd'} Innings  ·  ${teamName}`, PAD + 16, y + 26);

    // Score (right-aligned)
    const scoreStr = `${state.runs}/${state.wickets}  (${state.overs} ov)  RR: ${state.runRate ? state.runRate.toFixed(2) : '-'}`;
    ctx.font = 'bold 14px sans-serif';
    const scoreW = ctx.measureText(scoreStr).width;
    ctx.fillText(scoreStr, PAD + innerW - scoreW - 12, y + 26);

    y += 46;

    // ── Batting table ──
    drawTableHeader(ctx, PAD, y, innerW, [
      { text: 'BATTER',                x: PAD + 14 },
      { text: 'DISMISSAL / HOW OUT',   x: PAD + 220 },
      { text: 'R',   x: PAD + 490 },
      { text: 'B',   x: PAD + 540 },
      { text: '4s',  x: PAD + 590 },
      { text: '6s',  x: PAD + 640 },
      { text: 'SR',  x: PAD + 695 },
    ]);
    y += 28;

    battingCard.forEach((b, i) => {
      const rowBg = i % 2 === 0 ? C.bg : C.bgAlt;
      ctx.fillStyle = rowBg;
      ctx.fillRect(PAD, y, innerW, 28);
      ctx.strokeStyle = C.line;
      ctx.strokeRect(PAD, y, innerW, 28);

      // Highlight centurion / fifty
      if (b.runs >= 100) { ctx.fillStyle = C.amberBg; ctx.fillRect(PAD, y, innerW, 28); }
      else if (b.runs >= 50) { ctx.fillStyle = C.greenBg; ctx.fillRect(PAD, y, innerW, 28); }

      ctx.fillStyle = C.navy;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(b.name || 'Batter', PAD + 14, y + 19);

      ctx.fillStyle = C.slateLight;
      ctx.font = '10px sans-serif';
      ctx.fillText(b.dismissalText || 'not out', PAD + 220, y + 19);

      // Runs — coloured
      ctx.fillStyle = b.runs >= 100 ? C.amber : b.runs >= 50 ? C.green : C.navy;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(b.runs), PAD + 490, y + 19);

      ctx.fillStyle = C.slate;
      ctx.font = '11px sans-serif';
      ctx.fillText(String(b.balls),      PAD + 540, y + 19);
      ctx.fillText(String(b.fours),      PAD + 590, y + 19);
      ctx.fillText(String(b.sixes),      PAD + 640, y + 19);
      ctx.fillText(b.strikeRate ? b.strikeRate.toFixed(1) : '0.0', PAD + 695, y + 19);
      y += 28;
    });

    // ── Extras + Fall of Wickets ──
    ctx.fillStyle = C.bgRow;
    ctx.fillRect(PAD, y, innerW, 50);
    ctx.strokeStyle = C.lineMid;
    ctx.strokeRect(PAD, y, innerW, 50);

    ctx.fillStyle = C.navyLight;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Extras: ${extras.total}`, PAD + 14, y + 18);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = C.slateLight;
    ctx.fillText(`(W: ${extras.wide}  NB: ${extras.noball}  B: ${extras.bye}  LB: ${extras.legbye})`, PAD + 100, y + 18);

    ctx.fillStyle = C.navyLight;
    ctx.font = '10px sans-serif';
    if (fow.length > 0) {
      const fowStr = fow.map((f) => `${f.wicket}-${f.runs}(${f.name},${f.over}ov)`).join('  ');
      ctx.fillText(`FOW: ${fowStr}`, PAD + 14, y + 38);
    } else {
      ctx.fillText(`Total: ${state.runs} for ${state.wickets} wkts in ${state.overs} overs`, PAD + 14, y + 38);
    }
    y += 56;

    // ── Bowling table ──
    drawTableHeader(ctx, PAD, y, innerW, [
      { text: 'BOWLER', x: PAD + 14 },
      { text: 'O',      x: PAD + 490 },
      { text: 'M',      x: PAD + 540 },
      { text: 'R',      x: PAD + 590 },
      { text: 'W',      x: PAD + 640 },
      { text: 'ECON',   x: PAD + 695 },
    ]);
    y += 28;

    bowlingCard.forEach((bw, i) => {
      ctx.fillStyle = i % 2 === 0 ? C.bg : C.bgAlt;
      ctx.fillRect(PAD, y, innerW, 28);
      ctx.strokeStyle = C.line;
      ctx.strokeRect(PAD, y, innerW, 28);

      ctx.fillStyle = C.navy;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(bw.name || 'Bowler', PAD + 14, y + 19);

      ctx.fillStyle = C.slate;
      ctx.font = '11px sans-serif';
      ctx.fillText(String(bw.overs),   PAD + 490, y + 19);
      ctx.fillText(String(bw.maidens), PAD + 540, y + 19);
      ctx.fillText(String(bw.runs),    PAD + 590, y + 19);

      // Wickets — highlighted
      ctx.fillStyle = bw.wickets >= 5 ? C.red : bw.wickets >= 3 ? C.amber : C.navy;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(bw.wickets), PAD + 640, y + 19);

      ctx.fillStyle = C.slate;
      ctx.font = '11px sans-serif';
      ctx.fillText(bw.economy ? bw.economy.toFixed(2) : '0.00', PAD + 695, y + 19);
      y += 28;
    });

    // ── Over-by-Over grid ──
    if (overSummary.length > 0) {
      y += 12;

      // Section label
      ctx.fillStyle = C.navyLight;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`OVER-BY-OVER  (${overSummary.length} overs)`, PAD + 14, y + 14);
      y += 24;

      // Adaptive columns: same logic as the live UI
      const n = overSummary.length;
      const gridCols = n <= 8 ? n
                     : n <= 16 ? Math.ceil(n / 2)
                     : n <= 24 ? Math.ceil(n / 3)
                     : Math.ceil(n / 4);
      const gap = 6;
      const colW = (innerW - gap * (gridCols - 1)) / gridCols;
      const rowH = 52;

      overSummary.forEach((o, oIdx) => {
        const col = oIdx % gridCols;
        const row = Math.floor(oIdx / gridCols);
        const ox = PAD + col * (colW + gap);
        const oy = y + row * (rowH + gap);

        // Card background
        const isHighRun = o.runs >= 15;
        const hasWicket = o.wickets > 0;
        ctx.fillStyle = hasWicket ? C.redBg : isHighRun ? C.amberBg : C.bgAlt;
        roundRect(ctx, ox, oy, colW, rowH, 6);
        ctx.fill();
        ctx.strokeStyle = hasWicket ? '#fca5a5' : isHighRun ? '#fde68a' : C.lineMid;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Top row: over number + runs/wickets
        ctx.fillStyle = C.navyLight;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`Ov ${o.number}`, ox + 6, oy + 13);

        const runsWkt = `${o.runs}R${o.wickets ? `·${o.wickets}W` : ''}`;
        ctx.fillStyle = hasWicket ? C.red : C.emeraldDark;
        ctx.font = 'bold 10px sans-serif';
        const rwW = ctx.measureText(runsWkt).width;
        ctx.fillText(runsWkt, ox + colW - rwW - 6, oy + 13);

        // Bowler name
        if (o.bowlerName) {
          ctx.fillStyle = C.slateLight;
          ctx.font = '8px sans-serif';
          const bname = o.bowlerName.length > Math.floor(colW / 6) ? o.bowlerName.slice(0, Math.floor(colW / 6)) + '…' : o.bowlerName;
          ctx.fillText(bname, ox + 6, oy + 24);
        }

        // Ball chips
        let bx = ox + 5;
        const chipH = 14;
        const chipY = oy + rowH - chipH - 5;
        (o.balls || []).slice(0, 8).forEach((b) => {
          let bg = '#e2e8f0'; let fg = C.navy;
          if (b.includes('W'))               { bg = C.red;    fg = C.bg; }
          else if (b === '6' || b.startsWith('6')) { bg = C.emerald; fg = C.bg; }
          else if (b === '4' || b.startsWith('4')) { bg = C.blue;   fg = C.bg; }
          else if (b.includes('Wd') || b.includes('Nb')) { bg = C.amberBg; fg = C.amber; }

          const chipW = Math.max(14, ctx.measureText(b.slice(0, 3)).width + 6);
          ctx.fillStyle = bg;
          roundRect(ctx, bx, chipY, chipW, chipH, 3);
          ctx.fill();
          ctx.fillStyle = fg;
          ctx.font = 'bold 8px monospace';
          ctx.fillText(b.slice(0, 3), bx + 3, chipY + 10);
          bx += chipW + 3;
        });
      });

      const rows = Math.ceil(overSummary.length / gridCols);
      y += rows * (rowH + gap) + 12;
    }

    y += 28;
  });

  // ── 6. OFFICIAL SIGN-OFFS ──────────────────────────────────────────────────
  y += 8;
  ctx.fillStyle = C.bgAlt;
  roundRect(ctx, PAD, y, innerW, 138, 10);
  ctx.fill();
  ctx.strokeStyle = C.lineMid;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header
  ctx.fillStyle = C.navyMid;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('OFFICIAL MATCH VERIFICATION  &  SIGN-OFFS', PAD + 16, y + 24);

  const sigCols = 4;
  const sigColW = (innerW - 48) / sigCols;
  const sigs = [
    { label: `${homeName} Captain` },
    { label: `${awayName} Captain` },
    { label: 'Official Scorer'      },
    { label: 'Match Umpire'         },
  ];

  sigs.forEach((sig, i) => {
    const sx = PAD + 16 + i * (sigColW + 16);
    // Signature box
    ctx.strokeStyle = C.lineMid;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, y + 42, sigColW - 20, 50);

    ctx.strokeStyle = C.slateLight;
    ctx.beginPath();
    ctx.moveTo(sx, y + 94);
    ctx.lineTo(sx + sigColW - 20, y + 94);
    ctx.stroke();

    ctx.fillStyle = C.slate;
    ctx.font = '10px sans-serif';
    ctx.fillText(sig.label, sx, y + 110);
  });

  // Footer line
  ctx.fillStyle = C.muted;
  ctx.font = '10px sans-serif';
  ctx.fillText(
    `Generated by Cricket Score App  ·  ${new Date().toLocaleString()}  ·  Official League Document`,
    PAD + 16, y + 128
  );

  y += 148;

  // ── 7. Slice canvas into A4 pages → PDF ───────────────────────────────────
  const a4Ratio = 841.89 / 595.28;
  const pageHeightOnCanvas = Math.round(canvas.width * a4Ratio);
  const numPages = Math.max(1, Math.ceil(canvas.height / pageHeightOnCanvas));
  const pageImages = [];

  for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width  = canvas.width;
    pageCanvas.height = pageHeightOnCanvas;
    const pageCtx = pageCanvas.getContext('2d');

    pageCtx.fillStyle = C.bg;
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    const srcY = pageIdx * pageHeightOnCanvas;
    const srcH = Math.min(canvas.height - srcY, pageHeightOnCanvas);
    pageCtx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

    // Page number stamp
    pageCtx.fillStyle = C.muted;
    pageCtx.font = '24px sans-serif';
    const pageStr = `Page ${pageIdx + 1} of ${numPages}`;
    const pageStrW = pageCtx.measureText(pageStr).width;
    pageCtx.fillText(pageStr, pageCanvas.width - 60 - pageStrW, pageCanvas.height - 30);

    const jpegBlob    = await new Promise((resolve) => pageCanvas.toBlob(resolve, 'image/jpeg', 0.95));
    const arrayBuffer = await jpegBlob.arrayBuffer();
    pageImages.push({ width: pageCanvas.width, height: pageCanvas.height, bytes: new Uint8Array(arrayBuffer) });
  }

  // Build PDF
  const pdfBytes = buildPDFDocument(pageImages);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  const safeName = `${homeName}_vs_${awayName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${safeName}_Official_Scorecard.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function drawTableHeader(ctx, x, y, w, columns) {
  ctx.fillStyle = C.navyMid;
  ctx.fillRect(x, y, w, 28);
  ctx.strokeStyle = C.navyLight;
  ctx.strokeRect(x, y, w, 28);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 10px sans-serif';
  columns.forEach(({ text, x: cx }) => ctx.fillText(text, cx, y + 19));
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

/**
 * Builds a 100% valid, ISO-compliant PDF 1.4 binary from JPEG page images.
 */
function buildPDFDocument(pageImages) {
  const a4w = 595.28;
  const a4h = 841.89;
  const numPages = pageImages.length;
  const chunks = [];
  let currentOffset = 0;

  function addString(str) {
    const bytes = new TextEncoder().encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  }
  function addBytes(bytes) {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  const offsets = [];
  addString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  offsets[1] = currentOffset;
  addString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = currentOffset;
  const kids = pageImages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  addString(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>\nendobj\n`);

  pageImages.forEach((img, i) => {
    const pageObjNum    = 3 + i * 3;
    const imgObjNum     = 4 + i * 3;
    const contentObjNum = 5 + i * 3;

    offsets[pageObjNum] = currentOffset;
    addString(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${a4w} ${a4h}] /Resources << /XObject << /Im${i + 1} ${imgObjNum} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentObjNum} 0 R >>\nendobj\n`);

    offsets[imgObjNum] = currentOffset;
    addString(`${imgObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);
    addBytes(img.bytes);
    addString('\nendstream\nendobj\n');

    offsets[contentObjNum] = currentOffset;
    const content = `q\n${a4w} 0 0 ${a4h} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
    addString(`${contentObjNum} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
  });

  const xrefOffset = currentOffset;
  const totalObjs  = 2 + numPages * 3;
  addString(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjs; i++) {
    addString(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  addString(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) { out.set(chunk, pos); pos += chunk.length; }
  return out;
}
