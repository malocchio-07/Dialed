import { createClient } from '@/lib/supabase/server';
import { PlannerClient } from './PlannerClient';

export default async function PlannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: plans } = await supabase
    .from('shoot_plans')
    .select('*, photo_spots(id, name, latitude, longitude)')
    .eq('user_id', user!.id)
    .order('planned_date', { ascending: true });

  return <PlannerClient plans={plans ?? []} />;
}
