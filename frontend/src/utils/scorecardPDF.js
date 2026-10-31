/**
 * Official Cricket Match Scorecard PDF Generator
 * - Produces an official, high-resolution A4-sized PDF document.
 * - Works 100% client-side and offline on all devices (Android, iOS, PC, Mac).
 * - Formatted for official league records, tournaments, umpire/captain signatures.
 */

export async function downloadScorecardPDF(view) {
  if (!view || !view.match) return;
  const { match, innings = [] } = view;
  const homeName = match.homeTeam?.name || 'Team 1';
  const awayName = match.awayTeam?.name || 'Team 2';

  // 1. Calculate dynamic height based on data
  const width = 850;
  let estimatedHeight = 240; // Header + Meta + Result

  innings.forEach((inn) => {
    const state = inn.state || {};
    const batCount = (state.battingCard || []).length || 1;
    const bowlCount = (state.bowlingCard || []).length || 1;
    const oversCount = (state.overSummary || []).length;
    const overRows = Math.ceil(oversCount / 4) || 0;

    estimatedHeight += 50; // Innings title
    estimatedHeight += 32 + batCount * 26; // Batting table
    estimatedHeight += 52; // Extras + FOW
    estimatedHeight += 32 + bowlCount * 26; // Bowling table
    if (oversCount > 0) {
      estimatedHeight += 32 + overRows * 44; // Overs summary
    }
    estimatedHeight += 35; // Innings bottom spacing
  });

  estimatedHeight += 180; // Official Signatures & Verification box
  estimatedHeight += 50; // Bottom margins

  // 2. Setup Canvas with 2x retina scale for laser-sharp text in PDF
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = 24;

  // --- TOP HEADER ---
  // Navy banner
  ctx.fillStyle = '#0f172a'; // Navy 900
  roundRect(ctx, 24, y, width - 48, 105, 12);
  ctx.fill();

  // Top Badge
  ctx.fillStyle = '#10b981'; // Emerald 500
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('CRICKET SCORE APP · OFFICIAL MATCH RECORD & SCORESHEET', 44, y + 26);

  // Match Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  const matchTitle = match.name || `${homeName} vs ${awayName}`;
  ctx.fillText(matchTitle, 44, y + 56);

  // Meta items: Date, Ground, Format, Toss
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  const metaParts = [
    match.format ? `${match.format} (${match.overs} Ov)` : `${match.overs} Overs Match`,
    match.ground ? `Venue: ${match.ground}` : '',
    match.date ? `Date: ${new Date(match.date).toLocaleDateString()}` : '',
  ].filter(Boolean);
  ctx.fillText(metaParts.join('   |   '), 44, y + 80);

  y += 120;

  // --- RESULT BANNER ---
  if (match.result) {
    ctx.fillStyle = '#f0fdf4'; // Emerald 50
    roundRect(ctx, 24, y, width - 48, 62, 10);
    ctx.fill();
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#15803d'; // Emerald 700
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`🏆 Match Result: ${match.result.summary || 'Completed'}`, 42, y + 26);

    if (match.toss) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Toss: ${match.toss.winnerName} won the toss and chose to ${match.toss.decision}.`, 42, y + 46);
    }

    if (match.playerOfMatch) {
      ctx.fillStyle = '#b45309'; // Amber 700
      ctx.font = 'bold 12px sans-serif';
      const pomText = `⭐ Player of the Match: ${match.playerOfMatch.name} ${match.playerOfMatch.summary ? `(${match.playerOfMatch.summary})` : ''}`;
      const pomW = ctx.measureText(pomText).width;
      ctx.fillText(pomText, width - 44 - pomW, y + 26);
    }

    y += 76;
  }

  // --- INNINGS SECTIONS ---
  innings.forEach((inn, innIdx) => {
    const isHome = inn.battingTeam === match.homeTeam?.id;
    const teamName = isHome ? homeName : awayName;
    const state = inn.state || {};
    const battingCard = state.battingCard || [];
    const bowlingCard = state.bowlingCard || [];
    const extras = state.extras || { total: 0, wide: 0, noball: 0, bye: 0, legbye: 0 };
    const fow = state.fow || [];
    const overSummary = state.overSummary || [];

    // Innings Container Header
    ctx.fillStyle = '#1e293b'; // Slate 800
    roundRect(ctx, 24, y, width - 48, 38, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${innIdx + 1}. ${teamName} Innings`, 38, y + 24);

    const scoreStr = `${state.runs}/${state.wickets}  (${state.overs} Ov, RR: ${state.runRate ? state.runRate.toFixed(2) : '-'})`;
    ctx.font = 'bold 15px sans-serif';
    const scoreW = ctx.measureText(scoreStr).width;
    ctx.fillText(scoreStr, width - 40 - scoreW, y + 24);

    y += 44;

    // Batting Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(24, y, width - 48, 26);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(24, y, width - 48, 26);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('BATTER', 38, y + 17);
    ctx.fillText('DISMISSAL / HOW OUT', 230, y + 17);
    ctx.fillText('R', 500, y + 17);
    ctx.fillText('B', 560, y + 17);
    ctx.fillText('4s', 620, y + 17);
    ctx.fillText('6s', 680, y + 17);
    ctx.fillText('SR', 740, y + 17);
    y += 26;

    // Batting Rows
    battingCard.forEach((b, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(24, y, width - 48, 26);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(24, y, width - 48, 26);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(b.name || 'Batter', 38, y + 17);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(b.dismissalText || 'not out', 230, y + 17);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(b.runs), 500, y + 17);

      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText(String(b.balls), 560, y + 17);
      ctx.fillText(String(b.fours), 620, y + 17);
      ctx.fillText(String(b.sixes), 680, y + 17);
      ctx.fillText(b.strikeRate ? b.strikeRate.toFixed(1) : '0.0', 740, y + 17);
      y += 26;
    });

    // Extras & Total Row
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(24, y, width - 48, 44);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(24, y, width - 48, 44);

    ctx.fillStyle = '#334155';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Extras: ${extras.total} (wides: ${extras.wide}, no-balls: ${extras.noball}, byes: ${extras.bye}, leg-byes: ${extras.legbye})`, 38, y + 18);

    if (fow.length > 0) {
      const fowStr = fow.map((f) => `${f.wicket}-${f.runs} (${f.name}, ${f.over} ov)`).join(', ');
      ctx.fillText(`Fall of Wickets: ${fowStr}`, 38, y + 34);
    } else {
      ctx.fillText(`Total: ${state.runs} runs for ${state.wickets} wickets in ${state.overs} overs`, 38, y + 34);
    }
    y += 50;

    // Bowling Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(24, y, width - 48, 26);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(24, y, width - 48, 26);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('BOWLER', 38, y + 17);
    ctx.fillText('O', 500, y + 17);
    ctx.fillText('M', 560, y + 17);
    ctx.fillText('R', 620, y + 17);
    ctx.fillText('W', 680, y + 17);
    ctx.fillText('ECON', 740, y + 17);
    y += 26;

    // Bowling Rows
    bowlingCard.forEach((bw, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(24, y, width - 48, 26);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(24, y, width - 48, 26);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(bw.name || 'Bowler', 38, y + 17);

      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText(String(bw.overs), 500, y + 17);
      ctx.fillText(String(bw.maidens), 560, y + 17);
      ctx.fillText(String(bw.runs), 620, y + 17);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(bw.wickets), 680, y + 17);

      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText(bw.economy ? bw.economy.toFixed(2) : '0.00', 740, y + 17);
      y += 26;
    });

    // Overs Card (Over-by-Over Breakdown)
    if (overSummary.length > 0) {
      y += 10;
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`OVER-BY-OVER PROGRESS (${overSummary.length} OVERS BOWLED)`, 38, y + 14);
      y += 22;

      const colWidth = (width - 48 - 18) / 4;
      overSummary.forEach((o, oIdx) => {
        const col = oIdx % 4;
        const row = Math.floor(oIdx / 4);
        const ox = 24 + col * (colWidth + 6);
        const oy = y + row * 44;

        ctx.fillStyle = '#f8fafc';
        roundRect(ctx, ox, oy, colWidth, 38, 6);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        const bName = o.bowlerName ? o.bowlerName.slice(0, 10) : 'Bowler';
        ctx.fillText(`Ov ${o.number}: ${bName}`, ox + 6, oy + 13);

        ctx.fillStyle = '#047857';
        ctx.font = 'bold 10px sans-serif';
        const runsWkt = `${o.runs}R${o.wickets ? `·${o.wickets}W` : ''}`;
        const rwWidth = ctx.measureText(runsWkt).width;
        ctx.fillText(runsWkt, ox + colWidth - rwWidth - 6, oy + 13);

        // Ball badges
        let bx = ox + 6;
        (o.balls || []).slice(0, 8).forEach((b) => {
          let badgeBg = '#e2e8f0';
          let badgeText = '#0f172a';
          if (b.includes('W')) { badgeBg = '#dc2626'; badgeText = '#ffffff'; }
          else if (b.includes('4')) { badgeBg = '#2563eb'; badgeText = '#ffffff'; }
          else if (b.includes('6')) { badgeBg = '#059669'; badgeText = '#ffffff'; }
          else if (b.includes('Wd') || b.includes('Nb')) { badgeBg = '#fef3c7'; badgeText = '#92400e'; }

          ctx.fillStyle = badgeBg;
          roundRect(ctx, bx, oy + 19, 18, 14, 3);
          ctx.fill();

          ctx.fillStyle = badgeText;
          ctx.font = 'bold 8px monospace';
          ctx.fillText(b.slice(0, 2), bx + 3, oy + 30);
          bx += 22;
        });
      });

      y += Math.ceil(overSummary.length / 4) * 44 + 10;
    }

    y += 24;
  });

  // --- OFFICIAL SIGN-OFFS & VERIFICATION SECTION ---
  y += 10;
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, 24, y, width - 48, 130, 8);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('OFFICIAL MATCH VERIFICATION & SIGN-OFFS', 42, y + 24);

  // Signature lines
  const sigColWidth = (width - 48 - 60) / 4;
  const sigs = [
    { label: `${homeName} Captain`, x: 42 },
    { label: `${awayName} Captain`, x: 42 + sigColWidth + 20 },
    { label: 'Official Scorer', x: 42 + (sigColWidth + 20) * 2 },
    { label: 'Match Umpire', x: 42 + (sigColWidth + 20) * 3 },
  ];

  sigs.forEach((sig) => {
    // Signature line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sig.x, y + 80);
    ctx.lineTo(sig.x + sigColWidth - 10, y + 80);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '10px sans-serif';
    ctx.fillText(sig.label, sig.x, y + 96);
  });

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.fillText(`Generated by Cricket Score App · ${new Date().toLocaleString()} · Official League Document`, 42, y + 118);

  // 3. Slice Canvas into Standard A4 Pages and compile into PDF
  // A4 aspect ratio: 841.89 / 595.28 ≈ 1.4142
  const a4Ratio = 841.89 / 595.28;
  const pageHeightOnCanvas = Math.round(canvas.width * a4Ratio);

  const numPages = Math.max(1, Math.ceil(canvas.height / pageHeightOnCanvas));
  const pageImages = [];

  for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightOnCanvas;
    const pageCtx = pageCanvas.getContext('2d');

    // Fill white background for page
    pageCtx.fillStyle = '#ffffff';
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    // Source slice from main canvas
    const srcY = pageIdx * pageHeightOnCanvas;
    const srcH = Math.min(canvas.height - srcY, pageHeightOnCanvas);

    pageCtx.drawImage(
      canvas,
      0, srcY, canvas.width, srcH,
      0, 0, canvas.width, srcH
    );

    // Page Number Stamp at bottom
    pageCtx.fillStyle = '#94a3b8';
    pageCtx.font = '24px sans-serif';
    const pageStr = `Page ${pageIdx + 1} of ${numPages}`;
    const pageStrW = pageCtx.measureText(pageStr).width;
    pageCtx.fillText(pageStr, pageCanvas.width - 60 - pageStrW, pageCanvas.height - 30);

    // Convert page canvas to JPEG blob
    const jpegBlob = await new Promise((resolve) => pageCanvas.toBlob(resolve, 'image/jpeg', 0.94));
    const arrayBuffer = await jpegBlob.arrayBuffer();
    pageImages.push({
      width: pageCanvas.width,
      height: pageCanvas.height,
      bytes: new Uint8Array(arrayBuffer),
    });
  }

  // 4. Build standard PDF-1.4 file
  const pdfBytes = buildPDFDocument(pageImages);

  // 5. Trigger download
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = `${homeName}_vs_${awayName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${safeName}_Official_Scorecard.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Builds a 100% valid, ISO-compliant PDF 1.4 binary document from an array of JPEG page images.
 * Works natively in all PDF viewers without any external libraries.
 */
function buildPDFDocument(pageImages) {
  const a4w = 595.28;
  const a4h = 841.89;
  const numPages = pageImages.length;

  const chunks = [];
  let currentOffset = 0;

  function addString(str) {
    const enc = new TextEncoder();
    const bytes = enc.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  function addBytes(bytes) {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  const offsets = [];

  // PDF Header
  addString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Obj 1: Catalog
  offsets[1] = currentOffset;
  addString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages Collection
  offsets[2] = currentOffset;
  const kids = pageImages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  addString(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>\nendobj\n`);

  // Each Page: Page Obj, Image XObject, Content Stream
  pageImages.forEach((img, i) => {
    const pageObjNum = 3 + i * 3;
    const imgObjNum = 4 + i * 3;
    const contentObjNum = 5 + i * 3;

    // Page Object
    offsets[pageObjNum] = currentOffset;
    addString(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${a4w} ${a4h}] /Resources << /XObject << /Im${i + 1} ${imgObjNum} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentObjNum} 0 R >>\nendobj\n`);

    // Image XObject (JPEG via DCTDecode)
    offsets[imgObjNum] = currentOffset;
    addString(`${imgObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);
    addBytes(img.bytes);
    addString('\nendstream\nendobj\n');

    // Content Stream
    offsets[contentObjNum] = currentOffset;
    const content = `q\n${a4w} 0 0 ${a4h} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
    addString(`${contentObjNum} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
  });

  // Cross-reference table (xref)
  const xrefOffset = currentOffset;
  const totalObjs = 2 + numPages * 3;
  addString(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjs; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    addString(`${offStr} 00000 n \n`);
  }

  // Trailer
  addString(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  // Merge chunks into a single Uint8Array
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
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
