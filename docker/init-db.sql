-- BIPES Database Initialization Script
-- This runs automatically when PostgreSQL container starts for the first time

-- Authentication Tables
-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  teacher_id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  last_login NUMERIC(16,6),
  is_active BOOLEAN DEFAULT TRUE
);

-- Students table (global student accounts)
CREATE TABLE IF NOT EXISTS students (
  student_id SERIAL PRIMARY KEY,
  student_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_changed BOOLEAN DEFAULT FALSE,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  created_by_teacher_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (created_by_teacher_id) REFERENCES teachers(teacher_id)
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  class_id SERIAL PRIMARY KEY,
  class_name VARCHAR(100) NOT NULL,
  class_code VARCHAR(8) UNIQUE NOT NULL,
  teacher_id INTEGER NOT NULL,
  description TEXT,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

-- Enrollments (many-to-many: students <-> classes)
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  enrolled_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  UNIQUE(class_id, student_id)
);

-- Projects table (if it doesn't exist yet, create basic version)
CREATE TABLE IF NOT EXISTS projects (
  uid VARCHAR(32) PRIMARY KEY,
  author VARCHAR(100),
  name VARCHAR(200) NOT NULL,
  data TEXT,
  last_edited NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6))
);

-- Security / audit events
CREATE TABLE IF NOT EXISTS auth_events (
  event_id BIGSERIAL PRIMARY KEY,
  user_type VARCHAR(20),
  user_id INTEGER,
  event_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  ip_address VARCHAR(64),
  details JSONB,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6))
);

-- Opaque login sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id BIGSERIAL PRIMARY KEY,
  session_token_hash VARCHAR(64) UNIQUE NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  user_id INTEGER NOT NULL,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  last_seen_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  expires_at NUMERIC(16,6) NOT NULL,
  rotated_at NUMERIC(16,6),
  revoked_at NUMERIC(16,6),
  ip_address VARCHAR(64),
  user_agent TEXT
);

-- MQTT devices managed through Mosquitto Dynamic Security
CREATE TABLE IF NOT EXISTS mqtt_devices (
  device_uid VARCHAR(64) PRIMARY KEY,
  owner_user_type VARCHAR(20) NOT NULL,
  owner_user_id INTEGER NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  mqtt_username VARCHAR(100) UNIQUE NOT NULL,
  mqtt_topic_prefix VARCHAR(255) NOT NULL,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  last_rotated_at NUMERIC(16,6),
  revoked_at NUMERIC(16,6),
  is_active BOOLEAN DEFAULT TRUE
);

-- Add authentication-related columns to projects table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='student_id') THEN
        ALTER TABLE projects ADD COLUMN student_id INTEGER REFERENCES students(student_id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='teacher_id') THEN
        ALTER TABLE projects ADD COLUMN teacher_id INTEGER REFERENCES teachers(teacher_id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='assigned_class_id') THEN
        ALTER TABLE projects ADD COLUMN assigned_class_id INTEGER REFERENCES classes(class_id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='share_uid') THEN
        ALTER TABLE projects ADD COLUMN share_uid VARCHAR(32);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='share_token') THEN
        ALTER TABLE projects ADD COLUMN share_token VARCHAR(64);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='shared_public') THEN
        ALTER TABLE projects ADD COLUMN shared_public BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='projects' AND column_name='shared_class_id') THEN
        ALTER TABLE projects ADD COLUMN shared_class_id INTEGER REFERENCES classes(class_id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE students DROP COLUMN IF EXISTS email;
ALTER TABLE students DROP COLUMN IF EXISTS initial_password;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_student ON projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_teacher ON projects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_class ON projects(assigned_class_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_share_uid ON projects(share_uid);
CREATE INDEX IF NOT EXISTS idx_projects_shared_public ON projects(shared_public);
CREATE INDEX IF NOT EXISTS idx_projects_shared_class_id ON projects(shared_class_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_mqtt_devices_owner ON mqtt_devices(owner_user_type, owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mqtt_devices_username ON mqtt_devices(mqtt_username);

-- Grant permissions (optional, useful for security)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tsdbuser;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tsdbuser;
