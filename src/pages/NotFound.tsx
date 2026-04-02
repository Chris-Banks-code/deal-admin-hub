import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import dealLogo from "@/assets/deal-logo.jpg";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <img src={dealLogo} alt="Deal Group" className="h-12 w-auto object-contain mb-10" />
      <p className="text-8xl font-bold text-primary/10 select-none mb-2">404</p>
      <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs">
        The page you're looking for doesn't exist or you don't have access to it.
      </p>
      <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
    </div>
  );
};

export default NotFound;
