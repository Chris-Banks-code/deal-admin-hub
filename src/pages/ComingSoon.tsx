import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  features?: string[];
}

export default function ComingSoon({ title, description, features = [] }: Props) {
  return (
    <DashboardLayout title={title}>
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-10">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Construction className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {description ?? 'This module is scaffolded and coming online in an upcoming wave.'}
              </p>
              {features.length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                    Planned capabilities
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-foreground/80">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-primary/60" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
