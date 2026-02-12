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
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  initial_password TEXT,
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
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_student ON projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_teacher ON projects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_class ON projects(assigned_class_id);

-- Grant permissions (optional, useful for security)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tsdbuser;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tsdbuser;
