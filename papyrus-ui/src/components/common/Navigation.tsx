import Button from "./Button";

interface NavbarProps {
  showGetStarted?: boolean;
  rightContent?: React.ReactNode;
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ 
  showGetStarted = true, 
  rightContent,
  className = "" 
}) => {
  return (
    <nav className={`w-full backdrop-blur-sm bg-white/30 border-b border-amber-200/50 sticky top-0 z-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-amber-900">📚 Papyrus Ai</div>
          </div>
          
          {/* Right side content */}
          <div className="flex items-center gap-4">
            {rightContent}
            {showGetStarted && !rightContent && (
              <Button variant="ghost" size="md">
                Get Started
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;