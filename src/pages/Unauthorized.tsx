import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import dealLogo from '@/assets/deal-logo.jpg';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isNonDashboardRole = profile && !['admin', 'operation_manager'].includes(profile.role);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <img src={dealLogo} alt="Deal Group" className="h-12 w-auto object-contain mb-10" />
      <div className="text-center max-w-md">
        <ShieldAlert className="h-14 w-14 mx-auto text-destructive mb-4 opacity-80" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          {isNonDashboardRole
            ? 'Your account is configured for the mobile app. Please use the Deal mobile app to access your account.'
            : 'You do not have permission to access this page.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          <Button onClick={handleLogout}>Sign Out</Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
