module.exports = {
  availability: require('./availability.service'),
  capacity: require('./capacity.service'),
  holiday: require('./holiday.service'),
  branchSchedule: require('./branch-schedule.service'),
  slotEngine: require('./slot-engine'),
  exceptions: require('./exceptions.service'),
  bookingValidator: require('./booking-validator'),
  scheduleCache: require('./schedule-cache')
};
