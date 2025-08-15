export const generateGoogleCalendarUrl = (event: {
  title: string;
  description?: string;
  start_at: string;
  end_at?: string | null;
  location?: string;
  video_url?: string;
}) => {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  const startDate = new Date(event.start_at);
  const endDate = event.end_at ? new Date(event.end_at) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  
  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const params = new URLSearchParams({
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: [
      event.description || '',
      event.video_url ? `\n\nLien visio: ${event.video_url}` : '',
    ].filter(Boolean).join(''),
    location: event.location || '',
  });
  
  return `${baseUrl}&${params.toString()}`;
};