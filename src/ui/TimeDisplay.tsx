import React, { useState, useEffect } from 'react';

const TimeDisplay = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date()); // Initialize time on the client
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentTime) {
    return null; // Don't render anything on the server
  }

  return (
    <div className="text-lg font-medium px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300">
      {currentTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </div>
  );
};

export default TimeDisplay;