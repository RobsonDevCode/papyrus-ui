import React from 'react';

interface BookmarkAnimationProps {
  isVisible: boolean;
}

const BookmarkAnimation: React.FC<BookmarkAnimationProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center">
      {/* Bookmark dropping and inserting into spine */}
      <div className="relative" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        {/* The Bookmark Ribbon */}
        <div
          style={{
            animation: 'dropAndInsert 1.5s ease-out forwards',
          }}
        >
          <div className="relative">
            {/* Bookmark Body */}
            <div className="w-12 h-40 bg-gradient-to-b from-red-600 via-red-700 to-red-800 rounded-t-lg shadow-2xl relative overflow-hidden">
              {/* Shine effect */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{
                  animation: 'shine 1s ease-in-out 0.3s',
                }}
              ></div>
              
              {/* Leather texture effect */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
              }}></div>
            </div>
            
            {/* Bookmark Point (V-shaped bottom) */}
            <div className="w-0 h-0 mx-auto" style={{
              borderLeft: '24px solid transparent',
              borderRight: '24px solid transparent',
              borderTop: '20px solid #920e0eff'
            }}></div>
            
            {/* Checkmark on bookmark */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0"
              style={{
                animation: 'scaleIn 0.3s ease-out 0.8s forwards',
              }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>
        
        {/* "Saved" text that appears */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div 
            className="bg-amber-900/95 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-xl opacity-0"
            style={{
              animation: 'fadeInUp 0.4s ease-out 0.9s forwards',
            }}
          >
            Bookmark Saved
          </div>
        </div>
      </div>
      
      {/* CSS Keyframes */}
      <style>{`
        @keyframes dropAndInsert {
          0% { 
            transform: translateY(-500px) rotate(-10deg);
            opacity: 0;
          }
          40% { 
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          60% { 
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translateY(0) rotate(0deg) scale(0.8);
            opacity: 0.3;
          }
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default BookmarkAnimation;