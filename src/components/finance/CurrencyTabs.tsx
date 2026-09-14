import { Button } from '@/components/ui/button';

interface Props {
  currencies: string[];
  value: string;
  onChange: (c: string) => void;
}

/** Small LRD / USD switch. Hidden when there is only one currency in play. */
export function CurrencyTabs({ currencies, value, onChange }: Props) {
  if (currencies.length < 2) return null;
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {currencies.map(c => (
        <Button
          key={c}
          size="sm"
          variant={c === value ? 'secondary' : 'ghost'}
          className="h-7 px-3 text-xs font-mono"
          onClick={() => onChange(c)}
        >
          {c}
        </Button>
      ))}
    </div>
  );
}
