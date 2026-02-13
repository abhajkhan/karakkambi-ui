// Utility: Format ISO timestamp to user-friendly format
export const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  
  return date.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata', // Forces Indian Standard Time
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
});
};

// Utility: Format ISO timestamp to just time (e.g., "3:45 PM")
export const formatTimeOnly = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Utility: Check if a message is older than 1 day
export const isOlderThanOneDay = (isoString: string): boolean => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return diffDays >= 1;
};

// Utility: Get date string for comparison (YYYY-MM-DD) in local timezone
export const getDateKey = (isoString: string): string => {
  const date = new Date(isoString);
  // Use local timezone to get YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility: Format date for display in floating bubble (e.g., "Today", "Yesterday", or "January 15, 2024")
export const formatDateForDisplay = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  
  // Get dates in local timezone for comparison
  const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const nowStr = now.toLocaleDateString('en-CA');
  
  // Calculate yesterday's date in local timezone
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');
  
  if (dateStr === nowStr) {
    return 'Today';
  }
  
  if (dateStr === yesterdayStr) {
    return 'Yesterday';
  }
  
  // For older dates, show the full date in local timezone
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
};
