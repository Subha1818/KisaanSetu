export const calculateArrivalWindow = (
  openingTime: string, // e.g. "08:00:00"
  avgMinutes: number,
  peopleAhead: number,
  bookingDate?: string // e.g. "YYYY-MM-DD"
): { earliestTime: string; latestTime: string } | null => {
  if (!openingTime || avgMinutes <= 0 || peopleAhead < 0) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let targetYear = currentYear;
  let targetMonth = currentMonth;
  let targetDay = currentDay;
  let isToday = true;

  if (bookingDate) {
    const parts = bookingDate.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      targetYear = parts[0];
      targetMonth = parts[1] - 1;
      targetDay = parts[2];
      isToday =
        targetYear === currentYear &&
        targetMonth === currentMonth &&
        targetDay === currentDay;
    }
  }

  // Parse opening time on target date
  const [hours, minutes] = openingTime.split(':').map(Number);
  const startTime = new Date(targetYear, targetMonth, targetDay, hours, minutes, 0, 0);

  // Corrected base time logic:
  // - If bookingDate is NOT today: always use that date's opening time
  // - If bookingDate IS today: use current time if centre already opened, otherwise opening time
  const baseTime = !isToday ? startTime : (now > startTime ? now : startTime);

  // Compute estimated duration in minutes
  const estimatedMinutes = peopleAhead * avgMinutes;

  // Create a ±20% buffer, minimum 5 minutes on each side
  const buffer = Math.max(5, Math.round(estimatedMinutes * 0.2));

  // Clamp preventing earliest estimate from falling before base time
  const earliestMinutes = Math.max(0, estimatedMinutes - buffer);
  const latestMinutes = estimatedMinutes + buffer;

  const earliestTime = new Date(baseTime.getTime() + earliestMinutes * 60000);
  const latestTime = new Date(baseTime.getTime() + latestMinutes * 60000);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return {
    earliestTime: formatTime(earliestTime),
    latestTime: formatTime(latestTime)
  };
};
