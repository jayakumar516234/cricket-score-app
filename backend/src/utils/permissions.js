const idOf = (v) => String(v?._id ?? v);
const owns = (user, doc) => !!doc?.createdBy && idOf(doc.createdBy) === idOf(user._id);

/** Super Admin and Admin manage all teams. Team Admins manage only the teams they created. */
export function canManageTeam(user, team) {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'admin' || owns(user, team);
}

// Viewers can only look; they can never create or change anything.
export const canCreateTeams = (user) => !!user && user.role !== 'viewer';
export const canCreateMatches = (user) => !!user && user.role !== 'viewer';

export const isViewer = (user) => user?.role === 'viewer';
/** A viewer may only see their own team and the matches that team plays. */
export const viewerMayViewTeam = (user, teamId) => !isViewer(user) || String(user.viewTeam) === String(teamId?._id ?? teamId);
export const viewerMayViewMatch = (user, match) => !isViewer(user) || viewerMayViewTeam(user, match.homeTeam) || viewerMayViewTeam(user, match.awayTeam);

/** Super Admin and Admin score any match. Team Admins score only the matches they created. */
export function canManageMatch(user, match) {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'admin' || owns(user, match);
}
