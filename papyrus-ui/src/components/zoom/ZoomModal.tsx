import { useEffect } from "react";

interface ZoomModalProps {
  imageUrl: string;
  pageNumber: number;
  onClose: () => void;
}

const ZoomModal: React.FC<ZoomModalProps> = ({
  imageUrl,
  onClose,
  pageNumber,
}) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose(); // Call the passed-in close function
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose} // Call the passed-in close function
    >
      <div className="relative max-w-full max-h-full">
        <img
          src={imageUrl}
          className="w-2xl h-2xl object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
        />
        <button
          onClick={onClose} // Call the passed-in close function
          className="absolute top-4 right-4 bg-amber-400/90 hover:bg-amber-200 text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200"
          title="Close (Press Escape)"
        >
          ✕
        </button>
       {pageNumber && (
          <div className="absolute bottom-2 right-1 transform-translate-x-1/2 bg-white backdrop-blur-sm px-6 py-3 rounded-full text-sm text-gray-800 flex items-center space-x-4">
            Page {pageNumber}
          </div>
        )}

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full text-sm text-gray-800 flex items-center space-x-4">
          <span>Press Escape or click outside to close</span>
        </div>
      </div>
    </div>
  );
};

export default ZoomModal;
