ALTER TABLE public.profiles
 ADD COLUMN IF NOT EXISTS avatar_position_x integer NOT NULL DEFAULT 50 CHECK (avatar_position_x BETWEEN 0 AND 100),
 ADD COLUMN IF NOT EXISTS avatar_position_y integer NOT NULL DEFAULT 50 CHECK (avatar_position_y BETWEEN 0 AND 100),
 ADD COLUMN IF NOT EXISTS banner_position_x integer NOT NULL DEFAULT 50 CHECK (banner_position_x BETWEEN 0 AND 100),
 ADD COLUMN IF NOT EXISTS banner_position_y integer NOT NULL DEFAULT 50 CHECK (banner_position_y BETWEEN 0 AND 100),
 ADD COLUMN IF NOT EXISTS banner_theme text NOT NULL DEFAULT 'poster' CHECK(banner_theme IN ('poster','midnight','aurora','cinema'));