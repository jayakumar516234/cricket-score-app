/**
 * Generates an HD (1080x1350) Match Winner & Player of the Match Poster
 * optimized for Instagram Stories, WhatsApp Status & Facebook.
 * Works 100% offline via HTML5 Canvas.
 */

export function downloadMatchPoster(view) {
  if (!view || !view.match) return;
  const { match, innings = [] } = view;
  const home = match.homeTeam || { name: 'Team 1' };
  const away = match.awayTeam || { name: 'Team 2' };
  const r = match.result || {};
  const pom = match.playerOfMatch;

  const winnerTeam = r.winner === home.id ? home : r.winner === away.id ? away : null;
  const winnerName = winnerTeam ? winnerTeam.name : (r.tie ? 'MATCH TIED / DRAWN' : 'MATCH COMPLETED');

  const width = 1080;
  const height = 1380;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Deep Stadium Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#060d19');
  bgGrad.addColorStop(0.35, '#0a192f');
  bgGrad.addColorStop(0.75, '#0d2238');
  bgGrad.addColorStop(1, '#050c17');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Stadium Glows
  drawRadialGlow(ctx, width * 0.25, 120, 260, 'rgba(16, 185, 129, 0.22)');
  drawRadialGlow(ctx, width * 0.75, 120, 260, 'rgba(59, 130, 246, 0.22)');
  drawRadialGlow(ctx, width * 0.5, 620, 340, 'rgba(245, 158, 11, 0.15)');

  // Outer Golden Border
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  roundRect(ctx, 36, 36, width - 72, height - 72, 28);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 48, 48, width - 96, height - 96, 20);
  ctx.stroke();

  let y = 90;

  // Header Tag
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  roundRect(ctx, (width - 320) / 2, y, 320, 36, 18);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CRICKET SCORE APP · OFFICIAL RESULT', width / 2, y + 23);

  y += 65;

  // Match Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`${home.name} vs ${away.name}`, width / 2, y);

  y += 32;

  // Format, Venue, Date
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  const meta = [
    match.format ? `${match.format} (${match.overs} Overs)` : `${match.overs} Overs Match`,
    match.venue ? `📍 ${match.venue}` : '',
    match.date ? `📅 ${new Date(match.date).toLocaleDateString()}` : '',
  ].filter(Boolean).join('   |   ');
  ctx.fillText(meta, width / 2, y);

  y += 50;

  // Winner Trophy Section
  drawTrophyIcon(ctx, width / 2, y + 40);
  y += 115;

  ctx.fillStyle = '#f59e0b'; // Gold
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(r.tie ? '🤝 LEVEL SCORES' : '🏆 WINNERS & CHAMPIONS', width / 2, y);

  y += 52;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText(winnerName, width / 2, y);

  y += 38;

  // Result Summary Pill
  if (r.summary) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    roundRect(ctx, (width - 560) / 2, y - 24, 560, 42, 21);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(r.summary, width / 2, y + 5);
  }

  y += 65;

  // Teams Scores Grid
  const cardW = 440;
  const cardH = 125;
  const leftX = (width - (cardW * 2 + 30)) / 2;
  const rightX = leftX + cardW + 30;

  const scoreOf = (tId) => innings.find((i) => i.battingTeam === tId)?.state;
  const sHome = scoreOf(home.id);
  const sAway = scoreOf(away.id);

  // Home Card
  drawTeamScoreCard(ctx, leftX, y, cardW, cardH, home.name, sHome, r.winner === home.id);
  // Away Card
  drawTeamScoreCard(ctx, rightX, y, cardW, cardH, away.name, sAway, r.winner === away.id);

  y += cardH + 50;

  // ⭐ Player of the Match Card ⭐
  if (pom) {
    const pomW = width - 160;
    const pomH = 210;
    const pomX = 80;

    // Glowing border container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    roundRect(ctx, pomX, y, pomW, pomH, 20);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Crown Banner Header
    ctx.fillStyle = '#f59e0b';
    roundRect(ctx, pomX + (pomW - 300) / 2, y - 18, 300, 36, 18);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('👑 PLAYER OF THE MATCH', width / 2, y + 6);

    // Player Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(pom.name || 'Star Player', width / 2, y + 65);

    // Summary Performance
    if (pom.summary) {
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`⚡ ${pom.summary}`, width / 2, y + 105);
    }

    // Points & Stats badges
    const pomTeam = pom.team === home.id ? home.name : pom.team === away.id ? away.name : '';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${pomTeam ? `${pomTeam}  ·  ` : ''}${pom.points ? `${pom.points} Match Points` : 'Outstanding Performance'}`, width / 2, y + 145);

    y += pomH + 45;
  } else {
    y += 40;
  }

  // Footer Watermark
  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText('MATCH SUMMARY · CRICKET SCORE APP', width / 2, height - 70);

  // Download Trigger
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeWinner = winnerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeWinner}_Match_Winner_Poster.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

function drawTeamScoreCard(ctx, x, y, w, h, name, state, isWinner) {
  ctx.fillStyle = isWinner ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();

  ctx.strokeStyle = isWinner ? '#10b981' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = isWinner ? 2.5 : 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = isWinner ? '#34d399' : '#e2e8f0';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(name.slice(0, 18), x + 24, y + 42);

  if (isWinner) {
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('WINNER', x + 24, y + 64);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  const scoreText = state ? `${state.runs}/${state.wickets}` : '-';
  ctx.fillText(scoreText, x + w - 24, y + 54);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  const ovText = state ? `(${state.overs} ov)` : 'Yet to bat';
  ctx.fillText(ovText, x + w - 24, y + 84);
}

function drawTrophyIcon(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);

  // Golden Trophy Cup
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(-32, -30);
  ctx.lineTo(32, -30);
  ctx.bezierCurveTo(30, 12, 16, 24, 0, 24);
  ctx.bezierCurveTo(-16, 24, -30, 12, -32, -30);
  ctx.fill();

  // Handles
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-34, -14, 12, Math.PI * 0.5, Math.PI * 1.5, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(34, -14, 12, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.stroke();

  // Stem & Base
  ctx.fillStyle = '#b45309';
  ctx.fillRect(-6, 24, 12, 16);
  ctx.fillStyle = '#f59e0b';
  roundRect(ctx, -26, 40, 52, 14, 4);
  ctx.fill();

  // Star in cup
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRadialGlow(ctx, x, y, radius, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
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
