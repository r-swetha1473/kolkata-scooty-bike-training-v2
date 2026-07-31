const { computeTrainerStatus } = require('../services/trainerLeave.service');

function formatTrainerRow(row) {
  const onLeaveToday = Boolean(row.on_leave_today);
  const isActive = Boolean(row.is_active);
  let leaveDates = [];
  if (Array.isArray(row.leave_dates)) {
    leaveDates = row.leave_dates;
  } else if (typeof row.leave_dates === 'string') {
    try {
      leaveDates = JSON.parse(row.leave_dates || '[]');
    } catch {
      leaveDates = [];
    }
  }

  return {
    id: row.id,
    user_id: row.user_id,
    bio: row.bio,
    experience_years: row.experience_years,
    specialization: row.specialization || [],
    rating: parseFloat(row.rating) || 0,
    total_sessions: row.total_sessions,
    is_active: isActive,
    branch_id: row.branch_id || null,
    branch_name: row.branch_name || null,
    status: computeTrainerStatus(isActive, onLeaveToday),
    on_leave_today: onLeaveToday,
    leave_dates: leaveDates,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profile: {
      id: row.profile_id,
      email: row.email,
      full_name: row.full_name,
      phone: row.phone,
      avatar_url: row.avatar_url,
      image_url: row.avatar_url || null,
      role: row.role
    }
  };
}

const TRAINER_LIST_SELECT = `
  SELECT t.*,
         p.id AS profile_id, p.email, p.full_name, p.phone, p.avatar_url, p.role,
         b.name AS branch_name,
         EXISTS (
           SELECT 1 FROM trainer_leave tl
           WHERE tl.trainer_id = t.id AND tl.leave_date = CURRENT_DATE
         ) AS on_leave_today,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'leave_date', tl.leave_date,
                 'reason', tl.reason
               ) ORDER BY tl.leave_date
             )
             FROM trainer_leave tl
             WHERE tl.trainer_id = t.id AND tl.leave_date >= CURRENT_DATE
           ),
           '[]'::json
         ) AS leave_dates
  FROM trainers t
  JOIN profiles p ON t.user_id = p.id
  LEFT JOIN branches b ON t.branch_id = b.id
`;

module.exports = {
  formatTrainerRow,
  TRAINER_LIST_SELECT
};
