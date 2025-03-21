import React from "react";

interface StatusIndicatorProps {
  isConnected: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isConnected }) => {
  return (
    <div>
      {isConnected ? (
        <span className="text-green-500 font-bold">Connected</span>
      ) : (
        <span className="text-red-500 font-bold">Not Connected</span>
      )}
    </div>
  );
};

export default StatusIndicator;
