/**
 * Generates an HD PNG scorecard image of the match including:
 * - Match header & Result summary
 * - Team 1: Batting, Extras, Fall of Wickets, Bowling, Over-by-Over card
 * - Team 2: Batting, Extras, Fall of Wickets, Bowling, Over-by-Over card
 * Works offline on any browser using HTML5 Canvas without any external libraries.
 */

export function downloadScorecardImage(view) {
  if (!view || !view.match) return;
  const { match, innings = [] } = view;
  const homeName = match.homeTeam?.name || 'Team 1';
  const awayName = match.awayTeam?.name || 'Team 2';

  // 1. Calculate required height dynamically
  const width = 840;
  let estimatedHeight = 220; // Header + Result + Margins

  innings.forEach((inn) => {
    const state = inn.state || {};
    const batCount = (state.battingCard || []).length;
    const bowlCount = (state.bowlingCard || []).length;
    const oversCount = (state.overSummary || []).length;
    const overRows = Math.ceil(oversCount / 4) || 1;

    estimatedHeight += 45; // Innings title
    estimatedHeight += 30 + batCount * 24; // Batting
    estimatedHeight += 45; // Extras & FOW
    estimatedHeight += 30 + bowlCount * 24; // Bowling
    if (oversCount > 0) {
      estimatedHeight += 30 + overRows * 42; // Overs Card
    }
    estimatedHeight += 30; // Spacing
  });
  estimatedHeight += 70; // Footer

  // 2. Setup canvas with 2x scale for sharp text
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = 20;

  // Header Banner
  ctx.fillStyle = '#0f172a'; // Navy 900
  roundRect(ctx, 20, y, width - 40, 95, 12);
  ctx.fill();

  ctx.fillStyle = '#10b981'; // Emerald 500
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('CRICKET MATCH SCORECARD', 40, y + 26);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${homeName} vs ${awayName}`, 40, y + 54);

  ctx.fillStyle = '#94a3b8'; // Slate 400
  ctx.font = '12px sans-serif';
  const metaText = [
    match.format ? `${match.format} (${match.overs} Overs)` : `${match.overs} Overs`,
    match.venue ? `Venue: ${match.venue}` : '',
    match.date ? `Date: ${new Date(match.date).toLocaleDateString()}` : '',
  ].filter(Boolean).join('  ·  ');
  ctx.fillText(metaText, 40, y + 78);

  y += 110;

  // Result Banner
  if (match.result) {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 20, y, width - 40, 52, 10);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#047857'; // Emerald 700
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`🏆 ${match.result.summary || 'Match Completed'}`, 36, y + 24);

    if (match.playerOfMatch) {
      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText(`⭐ Player of the Match: ${match.playerOfMatch.name} (${match.playerOfMatch.summary || ''})`, 36, y + 42);
    }
    y += 64;
  }

  // Innings Sections
  innings.forEach((inn, innIdx) => {
    const isHome = inn.battingTeam === match.homeTeam?.id;
    const teamName = isHome ? homeName : awayName;
    const state = inn.state || {};
    const battingCard = state.battingCard || [];
    const bowlingCard = state.bowlingCard || [];
    const extras = state.extras || { total: 0, wide: 0, noball: 0, bye: 0, legbye: 0 };
    const fow = state.fow || [];
    const overSummary = state.overSummary || [];

    // Innings Container Box
    const startY = y;
    let innBoxHeight = 45 + 30 + battingCard.length * 24 + 45 + 30 + bowlingCard.length * 24;
    if (overSummary.length > 0) {
      innBoxHeight += 30 + Math.ceil(overSummary.length / 4) * 42;
    }
    innBoxHeight += 15;

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 20, y, width - 40, innBoxHeight, 10);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Innings Header
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${innIdx + 1}. ${teamName} Innings`, 36, y + 28);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    const scoreStr = `${state.runs}/${state.wickets} (${state.overs} ov, RR: ${state.runRate ? state.runRate.toFixed(2) : '-'})`;
    const scoreWidth = ctx.measureText(scoreStr).width;
    ctx.fillText(scoreStr, width - 36 - scoreWidth, y + 28);

    y += 42;

    // Batting Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(36, y, width - 72, 24);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('BATTER', 44, y + 16);
    ctx.fillText('HOW OUT', 210, y + 16);
    ctx.fillText('R', 470, y + 16);
    ctx.fillText('B', 520, y + 16);
    ctx.fillText('4s', 570, y + 16);
    ctx.fillText('6s', 620, y + 16);
    ctx.fillText('SR', 680, y + 16);
    y += 24;

    // Batting Rows
    battingCard.forEach((b, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(36, y, width - 72, 24);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(b.name || 'Batter', 44, y + 16);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(b.dismissalText || 'not out', 210, y + 16);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(b.runs), 470, y + 16);

      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText(String(b.balls), 520, y + 16);
      ctx.fillText(String(b.fours), 570, y + 16);
      ctx.fillText(String(b.sixes), 620, y + 16);
      ctx.fillText(b.strikeRate ? b.strikeRate.toFixed(1) : '0.0', 680, y + 16);
      y += 24;
    });

    // Extras & Total
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(36, y, width - 72, 38);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(36, y, width - 72, 38);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Extras: ${extras.total} (wd ${extras.wide}, nb ${extras.noball}, b ${extras.bye}, lb ${extras.legbye})`, 44, y + 16);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`Total: ${state.runs}/${state.wickets} in ${state.overs} Overs`, 44, y + 30);
    y += 44;

    // Bowling Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(36, y, width - 72, 24);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('BOWLER', 44, y + 16);
    ctx.fillText('O', 470, y + 16);
    ctx.fillText('M', 520, y + 16);
    ctx.fillText('R', 570, y + 16);
    ctx.fillText('W', 620, y + 16);
    ctx.fillText('ECON', 680, y + 16);
    y += 24;

    // Bowling Rows
    bowlingCard.forEach((bw, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(36, y, width - 72, 24);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(bw.name || 'Bowler', 44, y + 16);

      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText(String(bw.overs), 470, y + 16);
      ctx.fillText(String(bw.maidens), 520, y + 16);
      ctx.fillText(String(bw.runs), 570, y + 16);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(String(bw.wickets), 620, y + 16);

      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText(bw.economy ? bw.economy.toFixed(2) : '0.00', 680, y + 16);
      y += 24;
    });

    // Overs Card (Over-by-Over Breakdown)
    if (overSummary.length > 0) {
      y += 8;
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`OVERS CARD (OVER-BY-OVER BREAKDOWN - ${overSummary.length} OVERS)`, 44, y + 14);
      y += 20;

      const colWidth = (width - 72 - 18) / 4;
      overSummary.forEach((o, oIdx) => {
        const col = oIdx % 4;
        const row = Math.floor(oIdx / 4);
        const ox = 36 + col * (colWidth + 6);
        const oy = y + row * 42;

        ctx.fillStyle = '#f8fafc';
        roundRect(ctx, ox, oy, colWidth, 36, 6);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        const bName = o.bowlerName ? o.bowlerName.slice(0, 10) : 'Bowler';
        ctx.fillText(`Ov ${o.number}: ${bName}`, ox + 5, oy + 13);

        ctx.fillStyle = '#047857';
        ctx.font = 'bold 10px sans-serif';
        const runsWkt = `${o.runs}R${o.wickets ? `·${o.wickets}W` : ''}`;
        const rwWidth = ctx.measureText(runsWkt).width;
        ctx.fillText(runsWkt, ox + colWidth - rwWidth - 5, oy + 13);

        // Ball badges
        let bx = ox + 5;
        (o.balls || []).slice(0, 8).forEach((b) => {
          let badgeBg = '#e2e8f0';
          let badgeText = '#0f172a';
          if (b.includes('W')) { badgeBg = '#dc2626'; badgeText = '#ffffff'; }
          else if (b.includes('4')) { badgeBg = '#2563eb'; badgeText = '#ffffff'; }
          else if (b.includes('6')) { badgeBg = '#059669'; badgeText = '#ffffff'; }
          else if (b.includes('Wd') || b.includes('Nb')) { badgeBg = '#fef3c7'; badgeText = '#92400e'; }

          ctx.fillStyle = badgeBg;
          roundRect(ctx, bx, oy + 18, 17, 13, 3);
          ctx.fill();

          ctx.fillStyle = badgeText;
          ctx.font = 'bold 8px monospace';
          const bwText = b.slice(0, 2);
          ctx.fillText(bwText, bx + 3, oy + 28);
          bx += 20;
        });
      });

      y += Math.ceil(overSummary.length / 4) * 42 + 8;
    }

    y += 24;
  });

  // Footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('Scored & Generated via Cricket Score App · Official Match Record', 36, y + 16);

  // 3. Trigger Download as PNG Image
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = `${homeName}_vs_${awayName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}_Scorecard.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
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
