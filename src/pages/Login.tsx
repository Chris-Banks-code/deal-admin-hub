import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import dealLogo from '@/assets/deal-logo.jpg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    const { error } = await signIn(email.trim(), password);

    if (error) {
      toast({ title: 'Login failed', description: error, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #0f1923 0%, #1B2838 40%, #243447 100%)' }}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C6A561, #D4B87A, #C6A561)' }} />

        <div className="relative z-10">
          <img src={dealLogo} alt="Deal Group" className="h-14 w-auto object-contain brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
              Admin<br />
              <span className="text-gradient-gold">Portal</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Manage your B2B wholesale operations across Liberia. Track orders, monitor agents, and grow your distribution network.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['Real-time Analytics', 'Order Management', 'Agent Tracking'].map(f => (
              <span key={f} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(198,165,97,0.12)', color: '#C6A561', border: '1px solid rgba(198,165,97,0.2)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} Deal Group Inc. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-[400px] animate-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <img src={dealLogo} alt="Deal Group" className="h-12 w-auto object-contain" />
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your admin account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@dealgroup.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-muted/50 border-border/60 focus:bg-card transition-colors"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <button type="button" className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 bg-muted/50 border-border/60 focus:bg-card transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" className="rounded" />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Keep me signed in
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground/60">
              Protected by enterprise-grade security. Access is restricted to authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
