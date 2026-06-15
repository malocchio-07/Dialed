'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PlannerClient } from './PlannerClient';
import type { ShootPlan } from '@/types';

export default function PlannerPage() {
  const [plans, setPlans] = useState<ShootPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('shoot_plans')
      .select('*, photo_spots(id, name, latitude, longitude)')
      .order('planned_date', { ascending: true })
      .then(({ data }) => {
        setPlans((data as ShootPlan[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6 text-[var(--muted)]">Loading planner…</div>;
  }

  return <PlannerClient plans={plans} />;
}
