const idOf = (v) => String(v?._id ?? v);
const owns = (user, doc) => !!doc?.createdBy && idOf(doc.createdBy) === idOf(user._id);

/** Super Admin and Admin manage all teams. Team Admins manage only the teams they created. */
export function canManageTeam(user, team) {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'admin' || owns(user, team);
}

// Viewers can only look; Team Admins can create at most 1 team; Super Admin / Admin unlimited.
export const canCreateTeams = (user, ownedCount = 0) => {
  if (!user || user.role === 'viewer') return false;
  if (user.role === 'superadmin' || user.role === 'admin') return true;
  return ownedCount < 1;
};
export const canCreateMatches = (user) => !!user && user.role !== 'viewer';

export const isViewer = (user) => user?.role === 'viewer';
/** A viewer may only see their own team and the matches that team plays. */
export const viewerMayViewTeam = (user, teamId) => !isViewer(user) || String(user.viewTeam) === String(teamId?._id ?? teamId);
export const viewerMayViewMatch = (user, match) => !isViewer(user) || viewerMayViewTeam(user, match.homeTeam) || viewerMayViewTeam(user, match.awayTeam);

/** Either superadmin, admin, or the team owner/manager of homeTeam OR awayTeam can manage and score a match.
 *  Tournament scorers may also score their tournament's matches. */
export function canManageMatch(user, match, homeTeamDoc = null, awayTeamDoc = null) {
  if (!user) return false;
  if (user.role === 'superadmin' || user.role === 'admin') return true;
  if (owns(user, match)) return true;
  
  // Either team's owner or manager (homeTeam or awayTeam) can edit and score their match
  if (homeTeamDoc && (owns(user, homeTeamDoc) || canManageTeam(user, homeTeamDoc))) return true;
  if (awayTeamDoc && (owns(user, awayTeamDoc) || canManageTeam(user, awayTeamDoc))) return true;

  if (match?.homeTeam && typeof match.homeTeam === 'object' && (owns(user, match.homeTeam) || canManageTeam(user, match.homeTeam))) return true;
  if (match?.awayTeam && typeof match.awayTeam === 'object' && (owns(user, match.awayTeam) || canManageTeam(user, match.awayTeam))) return true;

  // If user is assigned to either team (e.g. viewTeam / teamadmin)
  const userTeamId = user.viewTeam ? String(user.viewTeam) : null;
  const homeId = String(match?.homeTeam?._id ?? match?.homeTeam ?? '');
  const awayId = String(match?.awayTeam?._id ?? match?.awayTeam ?? '');
  if (userTeamId && (userTeamId === homeId || userTeamId === awayId)) return true;

  if (user.role === 'scorer' && match?.tournament && String(user.tournamentId) === String(match.tournament)) {
    return true;
  }
  return false;
}
