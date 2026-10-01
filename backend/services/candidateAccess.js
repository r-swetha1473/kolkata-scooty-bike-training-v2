/**
 * Candidate feature flag and access rules.
 * CANDIDATES_ENABLED defaults on. Set to 0/false/off/no to hide the feature.
 *
 * Permissions reuse the existing four columns (view/create/edit/delete):
 *   candidates.view / create / edit     list, admission, edits and classes
 *   candidates_payments.create           record a payment
 *   candidates_payments.edit            allow an overpayment (override)
 *   candidates_payments.delete          void a payment
 *
 * A future trainer login would pass role "trainer". They only see candidates
 * whose trainer_id matches their trainers row. Routes do not admit that role yet.
 */

function isCandidatesEnabled() {
  const raw = process.env.CANDIDATES_ENABLED;
  if (raw == null || String(raw).trim() === '') return true;
  return !['0', 'false', 'off', 'no'].includes(String(raw).trim().toLowerCase());
}

function candidatesGate(req, res, next) {
  if (isCandidatesEnabled()) return next();
  return res.status(404).json({
    success: false,
    message: 'Not found',
    errorCode: 'NOT_FOUND',
    code: 'NOT_FOUND'
  });
}

/**
 * SQL fragment. When the user is a trainer, restrict to candidates assigned to them.
 * `userIdRef` is a SQL placeholder such as "$3".
 */
function trainerScopeSql(user, userIdRef) {
  if (user?.role !== 'trainer') return '';
  return `AND c.trainer_id = (SELECT t.id FROM trainers t WHERE t.user_id = ${userIdRef} LIMIT 1)`;
}

function trainerCanSeeCandidate(user, candidate, trainerRow) {
  if (!user || user.role !== 'trainer') return true;
  if (!candidate?.trainer_id || !trainerRow?.id) return false;
  return String(candidate.trainer_id) === String(trainerRow.id);
}

module.exports = {
  isCandidatesEnabled,
  candidatesGate,
  trainerScopeSql,
  trainerCanSeeCandidate
};
