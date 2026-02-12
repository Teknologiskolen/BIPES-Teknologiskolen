"""
Authentication API endpoints for BIPES
Handles teacher/student login, registration, class management, and student enrollment
"""

from flask import Blueprint, request, jsonify, session, g, make_response
import json
from server.common import database as dbase
from server.common import auth

#--------------------------------------------------------------------------
# Blueprint
bp = Blueprint('auth_api', __name__, url_prefix='/api')
_db = 'API'

#---------------------------------------------------------------------------
# Teacher Authentication
#---------------------------------------------------------------------------

@bp.route('/auth/teacher/register', methods=['POST'])
def teacher_register():
    """
    Register a new teacher
    POST body: {email, password, full_name}
    Returns: {success: true, teacher_id} or {error}
    """
    try:
        obj = request.json
        email = obj.get('email', '').strip()
        password = obj.get('password', '')
        full_name = obj.get('full_name', '').strip()

        # Validate inputs
        if not email or not password or not full_name:
            return jsonify({'error': 'All fields are required'}), 400

        if not auth.validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        is_valid, error_msg = auth.validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400

        # Check if email already exists
        existing = dbase.fetch(_db, 'teachers', ['teacher_id'], ['email', email])
        if existing[2] is not None:
            return jsonify({'error': 'Email already registered'}), 409

        # Hash password and insert teacher
        password_hash = auth.hash_password(password)
        timestamp = auth.get_timestamp()

        dbase.insert(_db, 'teachers',
            ['email', 'password_hash', 'full_name', 'created_at'],
            (email, password_hash, full_name, timestamp))

        # Get the newly created teacher_id
        teacher_data = dbase.fetch(_db, 'teachers', ['teacher_id', 'full_name'], ['email', email])
        teacher_id = teacher_data[2][0]
        name = teacher_data[2][1]

        # Set session
        auth.set_user_session(teacher_id, 'teacher', name, email)

        return jsonify({
            'success': True,
            'teacher_id': teacher_id,
            'message': 'Teacher registered successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/auth/teacher/login', methods=['POST'])
def teacher_login():
    """
    Teacher login
    POST body: {email, password}
    Returns: {success: true, teacher_id} or {error}
    """
    try:
        obj = request.json
        email = obj.get('email', '').strip()
        password = obj.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Fetch teacher by email
        teacher_data = dbase.fetch(_db, 'teachers',
            ['teacher_id', 'password_hash', 'full_name', 'is_active'],
            ['email', email])

        if teacher_data[2] is None:
            return jsonify({'error': 'Invalid email or password'}), 401

        teacher_id, password_hash, full_name, is_active = teacher_data[2]

        # Check if account is active
        if not is_active:
            return jsonify({'error': 'Account is disabled'}), 403

        # Verify password
        if not auth.verify_password(password, password_hash):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Update last login
        timestamp = auth.get_timestamp()
        db = dbase.get_db(_db)
        sql = dbase._s("UPDATE teachers SET last_login = %s WHERE teacher_id = %s")
        db.execute(sql, (timestamp, teacher_id))
        db.commit()
        db.close()

        # Set session
        auth.set_user_session(teacher_id, 'teacher', full_name, email)

        return jsonify({
            'success': True,
            'teacher_id': teacher_id,
            'name': full_name,
            'email': email
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


#---------------------------------------------------------------------------
# Student Authentication
#---------------------------------------------------------------------------

@bp.route('/auth/student/login/class', methods=['POST'])
def student_login_class():
    """
    Student login with class code + name + password
    POST body: {class_code, student_name, password}
    Returns: {success: true, student_id, password_changed} or {error}
    """
    try:
        obj = request.json
        class_code = obj.get('class_code', '').strip().upper()
        student_name = obj.get('student_name', '').strip()
        password = obj.get('password', '')

        if not class_code or not student_name or not password:
            return jsonify({'error': 'All fields are required'}), 400

        # Query to find student by class code + name + password
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT s.student_id, s.student_name, s.password_hash, s.password_changed, s.email, s.is_active
            FROM students s
            JOIN enrollments e ON s.student_id = e.student_id
            JOIN classes c ON e.class_id = c.class_id
            WHERE c.class_code = %s
            AND s.student_name = %s
            AND e.is_active = TRUE
            LIMIT 1
        """)

        result = db.execute(sql, (class_code, student_name)).fetchone()
        db.close()

        if result is None:
            return jsonify({'error': 'Invalid class code, name, or password'}), 401

        student_id, name, password_hash, password_changed, email, is_active = result

        # Check if account is active
        if not is_active:
            return jsonify({'error': 'Account is disabled'}), 403

        # Verify password
        if not auth.verify_password(password, password_hash):
            return jsonify({'error': 'Invalid class code, name, or password'}), 401

        # Set session
        auth.set_user_session(student_id, 'student', name, email)

        return jsonify({
            'success': True,
            'student_id': student_id,
            'name': name,
            'password_changed': password_changed,
            'email': email
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/auth/student/login/email', methods=['POST'])
def student_login_email():
    """
    Student login with email + password
    POST body: {email, password}
    Returns: {success: true, student_id, password_changed} or {error}
    """
    try:
        obj = request.json
        email = obj.get('email', '').strip()
        password = obj.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Fetch student by email
        student_data = dbase.fetch(_db, 'students',
            ['student_id', 'student_name', 'password_hash', 'password_changed', 'email', 'is_active'],
            ['email', email])

        if student_data[2] is None:
            return jsonify({'error': 'Invalid email or password'}), 401

        student_id, name, password_hash, password_changed, email, is_active = student_data[2]

        # Check if account is active
        if not is_active:
            return jsonify({'error': 'Account is disabled'}), 403

        # Verify password
        if not auth.verify_password(password, password_hash):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Set session
        auth.set_user_session(student_id, 'student', name, email)

        return jsonify({
            'success': True,
            'student_id': student_id,
            'name': name,
            'password_changed': password_changed,
            'email': email
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/auth/student/change-password', methods=['POST'])
@auth.require_student()
def student_change_password():
    """
    Change student password (required on first login)
    POST body: {current_password, new_password}
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        student_id = user['user_id']

        obj = request.json
        current_password = obj.get('current_password', '')
        new_password = obj.get('new_password', '')

        if not current_password or not new_password:
            return jsonify({'error': 'Both current and new passwords are required'}), 400

        # Validate new password
        is_valid, error_msg = auth.validate_password_strength(new_password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400

        # Fetch current password hash
        student_data = dbase.fetch(_db, 'students',
            ['password_hash', 'password_changed'],
            ['student_id', student_id])

        if student_data[2] is None:
            return jsonify({'error': 'Student not found'}), 404

        password_hash, password_changed = student_data[2]

        # Verify current password
        if not auth.verify_password(current_password, password_hash):
            return jsonify({'error': 'Current password is incorrect'}), 401

        # Hash new password and update
        new_password_hash = auth.hash_password(new_password)
        db = dbase.get_db(_db)

        # Update password and clear initial_password
        sql = dbase._s("""
            UPDATE students
            SET password_hash = %s, initial_password = NULL, password_changed = TRUE
            WHERE student_id = %s
        """)
        db.execute(sql, (new_password_hash, student_id))
        db.commit()
        db.close()

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/auth/student/add-email', methods=['POST'])
@auth.require_student()
def student_add_email():
    """
    Add or update student email
    POST body: {email}
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        student_id = user['user_id']

        obj = request.json
        email = obj.get('email', '').strip()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        if not auth.validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        # Check if email already exists for another student
        existing = dbase.fetch(_db, 'students', ['student_id'], ['email', email])
        if existing[2] is not None and existing[2][0] != student_id:
            return jsonify({'error': 'Email already in use'}), 409

        # Update email
        db = dbase.get_db(_db)
        sql = dbase._s("UPDATE students SET email = %s WHERE student_id = %s")
        db.execute(sql, (email, student_id))
        db.commit()
        db.close()

        # Update session
        session['email'] = email

        return jsonify({
            'success': True,
            'message': 'Email updated successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


#---------------------------------------------------------------------------
# General Authentication
#---------------------------------------------------------------------------

@bp.route('/auth/logout', methods=['POST', 'GET'])
def logout():
    """
    Logout current user (teacher or student)
    Returns: {success: true}
    """
    auth.clear_user_session()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200


@bp.route('/auth/me', methods=['GET'])
@auth.require_login()
def get_current_user_info():
    """
    Get current logged-in user info
    Returns: {user_id, user_type, name, email} or {error}
    """
    try:
        user = auth.get_current_user()
        response = make_response(jsonify(user), 200)
        # Prevent caching of auth state
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


#---------------------------------------------------------------------------
# Class Management (Teachers Only)
#---------------------------------------------------------------------------

@bp.route('/classes/create', methods=['POST'])
@auth.require_teacher()
def create_class():
    """
    Create a new class
    POST body: {class_name, description}
    Returns: {success: true, class_id, class_code} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        obj = request.json
        class_name = obj.get('class_name', '').strip()
        description = obj.get('description', '').strip()

        if not class_name:
            return jsonify({'error': 'Class name is required'}), 400

        # Generate unique class code
        class_code = auth.generate_class_code()

        # Check for collision (very unlikely)
        existing = dbase.fetch(_db, 'classes', ['class_id'], ['class_code', class_code])
        while existing[2] is not None:
            class_code = auth.generate_class_code()
            existing = dbase.fetch(_db, 'classes', ['class_id'], ['class_code', class_code])

        timestamp = auth.get_timestamp()

        # Insert class
        dbase.insert(_db, 'classes',
            ['class_name', 'class_code', 'teacher_id', 'description', 'created_at'],
            (class_name, class_code, teacher_id, description, timestamp))

        # Get the newly created class_id
        class_data = dbase.fetch(_db, 'classes', ['class_id'], ['class_code', class_code])
        class_id = class_data[2][0]

        return jsonify({
            'success': True,
            'class_id': class_id,
            'class_code': class_code,
            'message': 'Class created successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/classes/my-classes', methods=['GET'])
@auth.require_teacher()
def get_my_classes():
    """
    Get all classes created by the current teacher
    Returns: {classes: [{class_id, class_name, class_code, description, created_at, student_count}]}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Get teacher's classes with student counts
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT c.class_id, c.class_name, c.class_code, c.description, c.created_at,
                   COUNT(e.enrollment_id) as student_count
            FROM classes c
            LEFT JOIN enrollments e ON c.class_id = e.class_id AND e.is_active = TRUE
            WHERE c.teacher_id = %s AND c.is_active = TRUE
            GROUP BY c.class_id, c.class_name, c.class_code, c.description, c.created_at
            ORDER BY c.created_at DESC
        """)

        rows = db.execute(sql, (teacher_id,)).fetchall()
        db.close()

        classes = []
        for row in rows:
            classes.append({
                'class_id': row[0],
                'class_name': row[1],
                'class_code': row[2],
                'description': row[3],
                'created_at': row[4],
                'student_count': row[5]
            })

        return jsonify({'classes': classes}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/classes/<int:class_id>', methods=['GET'])
@auth.require_teacher()
def get_class_details(class_id):
    """
    Get class details
    Returns: {class_id, class_name, class_code, description, created_at} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns this class
        class_data = dbase.fetch(_db, 'classes',
            ['class_id', 'class_name', 'class_code', 'description', 'created_at', 'teacher_id'],
            ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        if class_data[2][5] != teacher_id:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'class_id': class_data[2][0],
            'class_name': class_data[2][1],
            'class_code': class_data[2][2],
            'description': class_data[2][3],
            'created_at': class_data[2][4]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/classes/<int:class_id>', methods=['DELETE'])
@auth.require_teacher()
def delete_class(class_id):
    """
    Delete (deactivate) a class
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns this class
        class_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        if class_data[2][0] != teacher_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Soft delete
        db = dbase.get_db(_db)
        sql = dbase._s("UPDATE classes SET is_active = FALSE WHERE class_id = %s")
        db.execute(sql, (class_id,))
        db.commit()
        db.close()

        return jsonify({'success': True, 'message': 'Class deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


#---------------------------------------------------------------------------
# Student Management (Teachers Only)
#---------------------------------------------------------------------------

@bp.route('/classes/<int:class_id>/students/search', methods=['POST'])
@auth.require_teacher()
def search_students(class_id):
    """
    Search for existing students by name
    POST body: {search_query}
    Returns: {students: [{student_id, student_name, created_at}]} or {error}
    """
    try:
        obj = request.json
        search_query = obj.get('search_query', '').strip()

        if not search_query or len(search_query) < 2:
            return jsonify({'students': []}), 200

        # Search students by name (case-insensitive partial match)
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT student_id, student_name, created_at
            FROM students
            WHERE LOWER(student_name) LIKE LOWER(%s)
            AND is_active = TRUE
            LIMIT 10
        """)

        rows = db.execute(sql, (f'%{search_query}%',)).fetchall()
        db.close()

        students = []
        for row in rows:
            students.append({
                'student_id': row[0],
                'student_name': row[1],
                'created_at': row[2]
            })

        return jsonify({'students': students}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/classes/<int:class_id>/students/create', methods=['POST'])
@auth.require_teacher()
def create_student_and_enroll(class_id):
    """
    Create a new student and enroll in class
    POST body: {student_name}
    Returns: {success: true, student_id, initial_password} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns this class
        class_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        if class_data[2][0] != teacher_id:
            return jsonify({'error': 'Unauthorized'}), 403

        obj = request.json
        student_name = obj.get('student_name', '').strip()

        if not student_name:
            return jsonify({'error': 'Student name is required'}), 400

        # Generate initial password
        initial_password = auth.generate_initial_password()
        password_hash = auth.hash_password(initial_password)
        timestamp = auth.get_timestamp()

        # Create student and get the new student_id via RETURNING
        db = dbase.get_db(_db)
        sql = dbase._s("""
            INSERT INTO students (student_name, password_hash, initial_password, created_at, created_by_teacher_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING student_id
        """)
        result = db.execute(sql, (student_name, password_hash, initial_password, timestamp, teacher_id)).fetchone()
        db.commit()
        student_id = result[0]

        # Enroll student in class
        sql2 = dbase._s("""
            INSERT INTO enrollments (class_id, student_id, enrolled_at)
            VALUES (%s, %s, %s)
        """)
        db.execute(sql2, (class_id, student_id, timestamp))
        db.commit()
        db.close()
        g.pop('db', None)

        return jsonify({
            'success': True,
            'student_id': student_id,
            'initial_password': initial_password,
            'message': 'Student created and enrolled successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/classes/<int:class_id>/students/add', methods=['POST'])
@auth.require_teacher()
def add_existing_student(class_id):
    """
    Add an existing student to class
    POST body: {student_id}
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns this class
        class_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        if class_data[2][0] != teacher_id:
            return jsonify({'error': 'Unauthorized'}), 403

        obj = request.json
        student_id = obj.get('student_id')

        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400

        # Check if student exists
        student_data = dbase.fetch(_db, 'students', ['student_id'], ['student_id', student_id])
        if student_data[2] is None:
            return jsonify({'error': 'Student not found'}), 404

        # Check if already enrolled
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT enrollment_id FROM enrollments
            WHERE class_id = %s AND student_id = %s
        """)
        existing = db.execute(sql, (class_id, student_id)).fetchone()

        if existing is not None:
            db.close()
            return jsonify({'error': 'Student already enrolled in this class'}), 409

        # Enroll student
        timestamp = auth.get_timestamp()
        dbase.insert(_db, 'enrollments',
            ['class_id', 'student_id', 'enrolled_at'],
            (class_id, student_id, timestamp))

        db.close()

        return jsonify({
            'success': True,
            'message': 'Student added to class successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/classes/<int:class_id>/students/<int:student_id>', methods=['DELETE'])
@auth.require_teacher()
def remove_student_from_class(class_id, student_id):
    """
    Remove a student from class
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns this class
        class_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        if class_data[2][0] != teacher_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Soft delete enrollment
        db = dbase.get_db(_db)
        sql = dbase._s("""
            UPDATE enrollments SET is_active = FALSE
            WHERE class_id = %s AND student_id = %s
        """)
        db.execute(sql, (class_id, student_id))
        db.commit()
        db.close()

        return jsonify({'success': True, 'message': 'Student removed from class'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/classes/<int:class_id>/students', methods=['GET'])
@auth.require_teacher()
def get_class_students(class_id):
    """
    Get all students in a class (with passwords if not changed)
    Returns: {students: [{student_id, student_name, password, password_changed, enrolled_at}]} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns this class
        class_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        if class_data[2][0] != teacher_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get students in class
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT s.student_id, s.student_name, s.initial_password, s.password_changed, e.enrolled_at
            FROM students s
            JOIN enrollments e ON s.student_id = e.student_id
            WHERE e.class_id = %s AND e.is_active = TRUE
            ORDER BY e.enrolled_at DESC
        """)

        rows = db.execute(sql, (class_id,)).fetchall()
        db.close()

        students = []
        for row in rows:
            student_id, student_name, initial_password, password_changed, enrolled_at = row

            # Show password only if not changed
            password_display = initial_password if not password_changed else None

            students.append({
                'student_id': student_id,
                'student_name': student_name,
                'password': password_display,  # Null if password was changed
                'password_changed': password_changed,
                'enrolled_at': enrolled_at
            })

        return jsonify({'students': students}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


#---------------------------------------------------------------------------
# Student Enrollment
#---------------------------------------------------------------------------

@bp.route('/students/my-classes', methods=['GET'])
@auth.require_student()
def get_student_classes():
    """
    Get all classes a student is enrolled in
    Returns: {classes: [{class_id, class_name, class_code, teacher_name, enrolled_at}]} or {error}
    """
    try:
        user = auth.get_current_user()
        student_id = user['user_id']

        # Get student's classes
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT c.class_id, c.class_name, c.class_code, t.full_name as teacher_name, e.enrolled_at
            FROM classes c
            JOIN enrollments e ON c.class_id = e.class_id
            JOIN teachers t ON c.teacher_id = t.teacher_id
            WHERE e.student_id = %s AND e.is_active = TRUE AND c.is_active = TRUE
            ORDER BY e.enrolled_at DESC
        """)

        rows = db.execute(sql, (student_id,)).fetchall()
        db.close()

        classes = []
        for row in rows:
            classes.append({
                'class_id': row[0],
                'class_name': row[1],
                'class_code': row[2],
                'teacher_name': row[3],
                'enrolled_at': row[4]
            })

        return jsonify({'classes': classes}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


#---------------------------------------------------------------------------
# Projects
#---------------------------------------------------------------------------

@bp.route('/projects/save', methods=['POST'])
@auth.require_login()
def save_project():
    """
    Save a project (student or teacher)
    POST body: {uid, name, data}
    Returns: {success: true, uid} or {error}
    """
    try:
        user = auth.get_current_user()
        user_id = user['user_id']
        user_type = user['user_type']

        obj = request.json
        uid = obj.get('uid', dbase.uid(6))
        name = obj.get('name', 'Untitled Project')
        data = obj.get('data', {})

        timestamp = auth.get_timestamp()

        # Check if project exists
        existing = dbase.fetch(_db, 'projects', ['uid'], ['uid', uid])

        if existing[2] is None:
            # Create new project
            if user_type == 'student':
                dbase.insert(_db, 'projects',
                    ['uid', 'student_id', 'name', 'author', 'data', 'created_at', 'last_edited'],
                    (uid, user_id, name, user['name'], json.dumps(data), timestamp, timestamp))
            else:  # teacher
                dbase.insert(_db, 'projects',
                    ['uid', 'teacher_id', 'name', 'author', 'data', 'created_at', 'last_edited'],
                    (uid, user_id, name, user['name'], json.dumps(data), timestamp, timestamp))
        else:
            # Update existing project
            db = dbase.get_db(_db)

            # Verify ownership
            sql = dbase._s("""
                SELECT student_id, teacher_id FROM projects WHERE uid = %s
            """)
            result = db.execute(sql, (uid,)).fetchone()

            if result is None:
                db.close()
                return jsonify({'error': 'Project not found'}), 404
            if user_type == 'student' and result[0] != user_id:
                db.close()
                return jsonify({'error': 'Unauthorized'}), 403
            if user_type == 'teacher' and result[1] != user_id:
                db.close()
                return jsonify({'error': 'Unauthorized'}), 403

            # Update project
            sql = dbase._s("""
                UPDATE projects SET name = %s, data = %s, last_edited = %s
                WHERE uid = %s
            """)
            db.execute(sql, (name, json.dumps(data), timestamp, uid))
            db.commit()
            db.close()

        return jsonify({
            'success': True,
            'uid': uid,
            'message': 'Project saved successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/projects/my-projects', methods=['GET'])
@auth.require_login()
def get_my_projects():
    """
    Get all projects for current user
    Returns: {projects: [{uid, name, assigned_class_id, created_at, last_edited}]} or {error}
    """
    try:
        user = auth.get_current_user()
        user_id = user['user_id']
        user_type = user['user_type']

        db = dbase.get_db(_db)

        if user_type == 'student':
            sql = dbase._s("""
                SELECT uid, name, assigned_class_id, created_at, last_edited
                FROM projects
                WHERE student_id = %s
                ORDER BY last_edited DESC
            """)
        else:  # teacher
            sql = dbase._s("""
                SELECT uid, name, assigned_class_id, created_at, last_edited
                FROM projects
                WHERE teacher_id = %s
                ORDER BY last_edited DESC
            """)

        rows = db.execute(sql, (user_id,)).fetchall()
        db.close()

        projects = []
        for row in rows:
            projects.append({
                'uid': row[0],
                'name': row[1],
                'assigned_class_id': row[2],
                'created_at': row[3],
                'last_edited': row[4]
            })

        return jsonify({'projects': projects}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/projects/<string:uid>/assign-class', methods=['POST'])
@auth.require_student()
def assign_project_to_class(uid):
    """
    Assign a project to a class (student only)
    POST body: {class_id} (or null to unassign)
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        student_id = user['user_id']

        obj = request.json
        class_id = obj.get('class_id')  # Can be None to unassign

        # Verify student owns this project
        project_data = dbase.fetch(_db, 'projects', ['student_id'], ['uid', uid])

        if project_data[2] is None:
            return jsonify({'error': 'Project not found'}), 404

        if project_data[2][0] != student_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # If assigning to a class, verify student is enrolled
        if class_id is not None:
            db = dbase.get_db(_db)
            sql = dbase._s("""
                SELECT enrollment_id FROM enrollments
                WHERE class_id = %s AND student_id = %s AND is_active = TRUE
            """)
            enrollment = db.execute(sql, (class_id, student_id)).fetchone()

            if enrollment is None:
                db.close()
                return jsonify({'error': 'Student not enrolled in this class'}), 403

        # Update project assignment
        db = dbase.get_db(_db)
        sql = dbase._s("UPDATE projects SET assigned_class_id = %s WHERE uid = %s")
        db.execute(sql, (class_id, uid))
        db.commit()
        db.close()

        message = 'Project assigned to class' if class_id else 'Project unassigned from class'

        return jsonify({
            'success': True,
            'message': message
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/projects/class/<int:class_id>', methods=['GET'])
@auth.require_teacher()
def get_class_projects(class_id):
    """
    Get all projects assigned to a class (teacher only)
    Returns: {projects: [{uid, name, student_name, created_at, last_edited, data}]} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns this class
        class_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        if class_data[2][0] != teacher_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get projects assigned to this class
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT p.uid, p.name, s.student_name, p.created_at, p.last_edited, p.data
            FROM projects p
            JOIN students s ON p.student_id = s.student_id
            WHERE p.assigned_class_id = %s
            ORDER BY p.last_edited DESC
        """)

        rows = db.execute(sql, (class_id,)).fetchall()
        db.close()

        projects = []
        for row in rows:
            projects.append({
                'uid': row[0],
                'name': row[1],
                'student_name': row[2],
                'created_at': row[3],
                'last_edited': row[4],
                'data': json.loads(row[5]) if row[5] else {}
            })

        return jsonify({'projects': projects}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/projects/<string:uid>', methods=['GET'])
@auth.require_login()
def get_project(uid):
    """
    Get a single project's full data
    Returns: {uid, name, data, created_at, last_edited} or {error}
    """
    try:
        user = auth.get_current_user()
        user_id = user['user_id']
        user_type = user['user_type']

        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT student_id, teacher_id, name, data, created_at, last_edited
            FROM projects WHERE uid = %s
        """)
        result = db.execute(sql, (uid,)).fetchone()
        db.close()

        if result is None:
            return jsonify({'error': 'Project not found'}), 404

        student_id, teacher_id, name, data, created_at, last_edited = result

        if user_type == 'student' and student_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        if user_type == 'teacher' and teacher_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'uid': uid,
            'name': name,
            'data': json.loads(data) if data else {},
            'created_at': created_at,
            'last_edited': last_edited
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/projects/<string:uid>', methods=['DELETE'])
@auth.require_login()
def delete_project(uid):
    """
    Delete a project
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        user_id = user['user_id']
        user_type = user['user_type']

        # Verify ownership
        db = dbase.get_db(_db)
        sql = dbase._s("SELECT student_id, teacher_id FROM projects WHERE uid = %s")
        result = db.execute(sql, (uid,)).fetchone()

        if result is None:
            db.close()
            return jsonify({'error': 'Project not found'}), 404

        student_id, teacher_id = result

        if user_type == 'student' and student_id != user_id:
            db.close()
            return jsonify({'error': 'Unauthorized'}), 403

        if user_type == 'teacher' and teacher_id != user_id:
            db.close()
            return jsonify({'error': 'Unauthorized'}), 403

        # Delete project
        sql = dbase._s("DELETE FROM projects WHERE uid = %s")
        db.execute(sql, (uid,))
        db.commit()
        db.close()

        return jsonify({
            'success': True,
            'message': 'Project deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/projects/migrate', methods=['POST'])
@auth.require_login()
def migrate_projects():
    """
    Migrate projects from localStorage to server
    POST body: {projects: [{uid, name, data}]}
    Returns: {success: true, imported_count} or {error}
    """
    try:
        user = auth.get_current_user()
        user_id = user['user_id']
        user_type = user['user_type']

        obj = request.json
        projects = obj.get('projects', [])

        if not isinstance(projects, list):
            return jsonify({'error': 'Projects must be an array'}), 400

        imported_count = 0
        timestamp = auth.get_timestamp()

        for project in projects:
            uid = project.get('uid', dbase.uid(6))
            name = project.get('name', 'Untitled Project')
            data = project.get('data', {})

            # Check if project already exists
            existing = dbase.fetch(_db, 'projects', ['uid'], ['uid', uid])
            if existing[2] is not None:
                continue  # Skip if already exists

            # Insert project
            if user_type == 'student':
                dbase.insert(_db, 'projects',
                    ['uid', 'student_id', 'name', 'author', 'data', 'created_at', 'last_edited'],
                    (uid, user_id, name, user['name'], json.dumps(data), timestamp, timestamp))
            else:  # teacher
                dbase.insert(_db, 'projects',
                    ['uid', 'teacher_id', 'name', 'author', 'data', 'created_at', 'last_edited'],
                    (uid, user_id, name, user['name'], json.dumps(data), timestamp, timestamp))

            imported_count += 1

        return jsonify({
            'success': True,
            'imported_count': imported_count,
            'message': f'{imported_count} project(s) migrated successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
