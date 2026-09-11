CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  prompt TEXT NOT NULL,
  duration INTEGER NOT NULL,
  aspect_ratio VARCHAR(20) DEFAULT '16:9',
  style VARCHAR(100) DEFAULT 'cinematic',
  status VARCHAR(50) DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_jobs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES video_projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'queued',
  total_duration INTEGER,
  scene_count INTEGER DEFAULT 0,
  completed_scenes INTEGER DEFAULT 0,
  current_scene INTEGER,
  final_video_path TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_scenes (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES video_jobs(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  duration INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  video_id TEXT,
  video_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES video_projects(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES video_jobs(id) ON DELETE CASCADE,
  title VARCHAR(255),
  video_path TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);