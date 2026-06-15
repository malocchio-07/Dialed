export type PhotoSpot = {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  tags: string[];
  notes: string | null;
  parking_notes: string | null;
  safety_notes: string | null;
  best_time_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SuggestedSettings = {
  aperture?: string;
  shutter_speed?: string;
  iso?: string;
  mode?: string;
  tips?: string[];
};

export type ShootPlan = {
  id: string;
  user_id: string;
  spot_id: string;
  planned_date: string;
  sunrise: string | null;
  sunset: string | null;
  golden_hour_morning: string | null;
  golden_hour_evening: string | null;
  blue_hour_morning: string | null;
  blue_hour_evening: string | null;
  cloud_cover: number | null;
  weather_summary: string | null;
  best_window: string | null;
  suggested_settings: SuggestedSettings;
  notes: string | null;
  created_at: string;
  photo_spots?: PhotoSpot;
};

export type PhotoStatus = 'unedited' | 'needs_edit' | 'edited' | 'posted' | 'portfolio';

export type Photo = {
  id: string;
  user_id: string;
  spot_id: string | null;
  image_url: string;
  storage_path: string;
  date_taken: string | null;
  status: PhotoStatus;
  camera_used: string | null;
  preset_used: string | null;
  notes: string | null;
  created_at: string;
  photo_spots?: Pick<PhotoSpot, 'id' | 'name'>;
};

export type WeatherData = {
  cloud_cover: number;
  temperature: number;
  wind_speed: number;
  weather_code: number;
  weather_description: string;
  hourly: HourlyWeather[];
};

export type HourlyWeather = {
  time: string;
  cloud_cover: number;
  temperature: number;
  weather_code: number;
};

export type SunTimes = {
  sunrise: Date;
  sunset: Date;
  goldenHourMorning: { start: Date; end: Date };
  goldenHourEvening: { start: Date; end: Date };
  blueHourMorning: { start: Date; end: Date };
  blueHourEvening: { start: Date; end: Date };
  solarNoon: Date;
};
