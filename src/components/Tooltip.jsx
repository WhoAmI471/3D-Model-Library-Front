import { useEffect, useState } from 'react';


export const Tooltip = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
  
    return (
      <div className="relative absolute">
        <div
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {children}
        </div>
        {isVisible && (
          <div className="absolute z-10 w-64 p-2 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded shadow-lg">
            {content}
          </div>
        )}
      </div>
    );
  };