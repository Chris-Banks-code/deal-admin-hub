import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_RULES, rulesFromRow, type CommissionRules } from '@/lib/commissions';

/** The saved commission split, used wherever a sale's commission is computed. */
export function useCommissionRules(): CommissionRules {
  const [rules, setRules] = useState<CommissionRules>({ ...DEFAULT_RULES });

  useEffect(() => {
    let active = true;
    (supabase.from as any)('commission_rules')
      .select('*')
      .limit(1)
      .then(({ data }: any) => {
        if (active) setRules(rulesFromRow((data || [])[0]));
      });
    return () => { active = false; };
  }, []);

  return rules;
}
