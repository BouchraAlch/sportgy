export interface Sport {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  icon?: string;
  created_at?: string;
}

export interface Club {
  id: string;
  sport_id: string;
  owner_id?: string;
  name: string;
  city: string;
  description: string;
  image_url: string;
  facilities: string[];
  created_at?: string;
}

export interface Coach {
  id: string;
  club_id: string;
  sport_id: string;
  full_name: string;
  title: string;
  bio: string;
  image_url: string;
  hourly_rate: number;
  created_at?: string;
}

export interface Booking {
  id: string;
  user_id: string;
  coach_id: string;
  club_id: string;
  sport_id: string;
  booking_date: string;
  time_slot: string;
  created_at?: string;
}