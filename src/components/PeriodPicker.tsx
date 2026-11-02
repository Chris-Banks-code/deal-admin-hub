import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PeriodMode } from '@/lib/finance';

interface Props {
  mode: PeriodMode;
  month: string;
  week: string;
  onMode: (m: PeriodMode) => void;
  onMonth: (m: string) => void;
  onWeek: (w: string) => void;
}

/** Overall / Monthly / Weekly picker shared by every time-sensitive page. */
export const PeriodPicker = ({ mode, month, week, onMode, onMonth, onWeek }: Props) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-md border border-border/50 bg-card p-0.5">
      {(['overall', 'month', 'week'] as PeriodMode[]).map(m => (
        <Button key={m} size="sm" variant={mode === m ? 'secondary' : 'ghost'}
          className="h-8 px-3 text-xs" onClick={() => onMode(m)}>
          {m === 'overall' ? 'Overall' : m === 'month' ? 'Monthly' : 'Weekly'}
        </Button>
      ))}
    </div>
    {mode === 'month' && (
      <Input type="month" aria-label="Month" className="h-9 w-[160px] text-xs"
        value={month} onChange={e => onMonth(e.target.value)} />
    )}
    {mode === 'week' && (
      <Input type="week" aria-label="Week" className="h-9 w-[170px] text-xs"
        value={week} onChange={e => onWeek(e.target.value)} />
    )}
  </div>
);
