import { NextRequest, NextResponse } from 'next/server';
import { getWeather } from '@/lib/weather';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const date = searchParams.get('date') ?? undefined;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  const data = await getWeather(lat, lng, date);
  if (!data) return NextResponse.json({ error: 'Weather unavailable' }, { status: 503 });

  return NextResponse.json(data);
}
