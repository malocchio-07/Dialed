'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PlannerClient } from './PlannerClient';
import type { ShootPlan, PhotoSpot } from '@/types';

type Spot = Pick<PhotoSpot, 'id' | 'name' | 'latitude' | 'longitude'>;

export default function PlannerPage() {
  const [plans, setPlans] = useState<ShootPlan[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from('shoot_plans')
        .select('*, photo_spots(id, name, latitude, longitude)')
        .order('planned_date', { ascending: true }),
      supabase
        .from('photo_spots')
        .select('id, name, latitude, longitude')
        .order('name'),
    ]).then(([plansRes, spotsRes]) => {
      setPlans((plansRes.data as ShootPlan[]) ?? []);
      setSpots((spotsRes.data as Spot[]) ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-6 text-[var(--muted)]">Loading planner…</div>;
  }

  return <PlannerClient plans={plans} spots={spots} />;
}
