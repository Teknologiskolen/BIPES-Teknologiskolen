"""
Authentication API endpoints for BIPES
Handles teacher/student login, registration, class management, and student enrollment
"""

from flask import Blueprint, request, jsonify, g, make_response
import json
import hmac
from server.common import database as dbase
from server.common import auth
from server.common import security

#--------------------------------------------------------------------------
# Blueprint
bp = Blueprint('auth_api', __name__, url_prefix='/api')
_db = 'API'


def _rehash_user_password_if_needed(table_name, id_column, user_id, password, stored_hash):
    if not auth.password_hash_needs_upgrade(stored_hash):
        return

    new_hash = auth.hash_password(password)
    db = dbase.get_db(_db)
    sql = dbase._s(f"UPDATE {table_name} SET password_hash = %s WHERE {id_column} = %s")
    db.execute(sql, (new_hash, user_id))
    db.commit()
    db.close()
    g.pop('db', None)

#---------------------------------------------------------------------------
# Teacher Authentication
#---------------------------------------------------------------------------

@bp.route('/auth/teacher/login', methods=['POST'])
@security.require_same_origin()
@auth.rate_limit(limit=5, window_seconds=300)
def teacher_login():
    """
    Teacher login
    POST body: {email, password}
    Returns: {success: true, teacher_id} or {error}
    """
    try:
        obj = request.json or {}
        email = obj.get('email', '').strip()
        password = obj.get('password', '')

        if not email or not password:
            security.log_auth_event('teacher_login_invalid_request', 'teacher', email or None)
            return jsonify({'error': 'Email and password are required'}), 400

        email_key = email.lower()[:100]

        # Reject over-long passwords BEFORE any Argon2 work (a multi-MB password is a cheap
        # CPU/memory DoS). Use the generic invalid-credentials response so it leaks nothing.
        if len(password) > auth.PASSWORD_MAX_LENGTH:
            security.log_auth_event('teacher_login_failed', 'teacher', email_key, {'reason': 'password_too_long'})
            return jsonify({'error': 'Invalid email or password'}), 401

        # Per-account lockout keyed on the SUBMITTED email (normalised), checked BEFORE the
        # account is resolved and applied identically whether or not the email is
        # registered. This closes the enumeration oracle: the lock previously keyed on
        # teacher_id (so only real emails could ever return 429) and a disabled account
        # returned a distinct 403. Now unknown-email, wrong-password, disabled and locked
        # are indistinguishable to the client.
        retry = security.login_failure_lock('teacher_login_failed', email_key)
        if retry:
            security.log_auth_event('teacher_login_locked', 'teacher', email_key, {'retry_after': retry})
            resp = jsonify({'error': 'Too many failed attempts. Please try again later.', 'retry_after': retry})
            resp.status_code = 429
            resp.headers['Retry-After'] = str(retry)
            return resp

        # Fetch teacher by email
        teacher_data = dbase.fetch(_db, 'teachers',
            ['teacher_id', 'password_hash', 'full_name', 'is_active', 'password_changed'],
            ['email', email])

        # Single generic failure path for unknown-email / wrong-password / disabled, all
        # logged under the same email key so the lockout counts them uniformly and none is
        # distinguishable from the others.
        def _login_failed(reason):
            security.log_auth_event('teacher_login_failed', 'teacher', email_key, {'reason': reason})
            return jsonify({'error': 'Invalid email or password'}), 401

        if teacher_data[2] is None:
            # Spend the same Argon2 time as a real account so response timing can't be
            # used to tell a registered email from an unregistered one.
            auth.dummy_password_verify(password)
            return _login_failed('unknown_email')

        teacher_id, password_hash, full_name, is_active, password_changed = teacher_data[2]

        # Verify the password first (constant Argon2 cost), then check active — both fail
        # with the identical 401 so a disabled account can't be told from a wrong password.
        if not auth.verify_password(password, password_hash):
            return _login_failed('bad_password')

        if not is_active:
            return _login_failed('inactive')

        _rehash_user_password_if_needed('teachers', 'teacher_id', teacher_id, password, password_hash)

        # Update last login
        timestamp = auth.get_timestamp()
        db = dbase.get_db(_db)
        sql = dbase._s("UPDATE teachers SET last_login = %s WHERE teacher_id = %s")
        db.execute(sql, (timestamp, teacher_id))
        db.commit()
        db.close()

        # Set session
        auth.set_user_session(teacher_id, 'teacher', full_name, email)
        security.log_auth_event('teacher_login_success', 'teacher', teacher_id, {'email': email})

        return jsonify({
            'success': True,
            'teacher_id': teacher_id,
            'name': full_name,
            'email': email,
            'password_changed': password_changed
        }), 200

    except Exception as e:
        security.log_auth_event('teacher_login_error', 'teacher', details={'error': str(e)})
        return security.server_error(e)


#---------------------------------------------------------------------------
# Student Authentication
#---------------------------------------------------------------------------

@bp.route('/auth/student/login/class', methods=['POST'])
@security.require_same_origin()
@auth.rate_limit(limit=5, window_seconds=300)
def student_login_class():
    """
    Student login with class code + name + password
    POST body: {class_code, student_name, password}
    Returns: {success: true, student_id, password_changed} or {error}
    """
    try:
        obj = request.json or {}
        class_code = obj.get('class_code', '').strip().upper()
        student_name = obj.get('student_name', '').strip()
        password = obj.get('password', '')

        if not class_code or not student_name or not password:
            security.log_auth_event('student_login_invalid_request', 'student', details={'class_code': class_code, 'student_name': student_name})
            return jsonify({'error': 'All fields are required'}), 400

        # Reject over-long passwords before any Argon2 work (CPU/memory DoS guard). Generic
        # response so it stays consistent with the other invalid-credential paths below.
        if len(password) > auth.PASSWORD_MAX_LENGTH:
            return jsonify({'error': 'Invalid class code, name, or password'}), 401

        # Per-identifier lockout (students have no email/id at this point, so key on the
        # class_code|name they log in with). Bounds guessing of one student's 8-char
        # password across IPs.
        lock_key = (class_code + '|' + student_name).lower()[:100]
        retry = security.login_failure_lock('student_login_failed', lock_key)
        if retry:
            security.log_auth_event('student_login_locked', 'student', lock_key, {'retry_after': retry})
            resp = jsonify({'error': 'Too many failed attempts. Please try again later.', 'retry_after': retry})
            resp.status_code = 429
            resp.headers['Retry-After'] = str(retry)
            return resp

        # Query to find candidate students by class code + name. Names are not globally
        # unique, so there may be more than one row; authenticate the row whose password
        # verifies rather than blindly taking the first (avoids logging in as the wrong
        # account when two students share a name). ORDER BY keeps it deterministic.
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT s.student_id, s.student_name, s.password_hash, s.password_changed
            FROM students s
            JOIN enrollments e ON s.student_id = e.student_id
            JOIN classes c ON e.class_id = c.class_id
            WHERE c.class_code = %s
            AND s.student_name = %s
            AND e.is_active = TRUE
            AND s.is_active = TRUE
            ORDER BY s.student_id
        """)

        rows = db.execute(sql, (class_code, student_name)).fetchall()
        db.close()

        # When no class+name matches, no Argon2 verification runs below. Spend one
        # dummy verification so the "no such student" timing matches "wrong password",
        # closing the enumeration oracle.
        if not rows:
            auth.dummy_password_verify(password)

        matched = None
        for row in rows:
            if auth.verify_password(password, row[2]):
                matched = row
                break

        if matched is None:
            security.log_auth_event('student_login_failed', 'student', lock_key, {'class_code': class_code, 'student_name': student_name, 'reason': 'invalid_credentials'})
            return jsonify({'error': 'Invalid class code, name, or password'}), 401

        student_id, name, password_hash, password_changed = matched

        _rehash_user_password_if_needed('students', 'student_id', student_id, password, password_hash)

        # Set session
        auth.set_user_session(student_id, 'student', name)
        security.log_auth_event('student_login_success', 'student', student_id, {'class_code': class_code})

        return jsonify({
            'success': True,
            'student_id': student_id,
            'name': name,
            'password_changed': password_changed
        }), 200

    except Exception as e:
        security.log_auth_event('student_login_error', 'student', details={'error': str(e)})
        return security.server_error(e)


@bp.route('/auth/student/login/email', methods=['POST'])
@security.require_same_origin()
@auth.rate_limit(limit=5, window_seconds=300)
def student_login_email():
    """
    Student email login is intentionally disabled.
    """
    security.log_auth_event('student_login_email_blocked', 'student')
    return jsonify({
        'error': 'Students must sign in with class code, username, and password'
    }), 403


@bp.route('/auth/student/change-password', methods=['POST'])
@auth.require_student()
@security.require_same_origin()
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

        # Update password and mark onboarding as complete. Wipe the stored one-time code
        # the moment the student sets their own password — it's no longer valid and must
        # not remain re-viewable by the teacher.
        sql = dbase._s("""
            UPDATE students
            SET password_hash = %s, password_changed = TRUE, initial_password_enc = NULL
            WHERE student_id = %s
        """)
        db.execute(sql, (new_password_hash, student_id))
        db.commit()
        db.close()
        g.pop('db', None)

        # Invalidate the student's other live sessions so a session created under the
        # old password (e.g. one an attacker still holds) can't outlive the change.
        # Keep the current session so the student isn't logged out of this tab.
        auth.revoke_other_sessions('student', student_id, getattr(g, 'auth_session_id', None))

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/auth/teacher/change-password', methods=['POST'])
@auth.require_teacher()
@security.require_same_origin()
def teacher_change_password():
    """
    Change teacher password. Forced on first login (server-created accounts start with
    password_changed = FALSE), and available voluntarily thereafter — same as students.
    POST body: {current_password, new_password}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        obj = request.json or {}
        current_password = obj.get('current_password', '')
        new_password = obj.get('new_password', '')

        if not current_password or not new_password:
            return jsonify({'error': 'Both current and new passwords are required'}), 400

        is_valid, error_msg = auth.validate_password_strength(new_password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400

        teacher_data = dbase.fetch(_db, 'teachers',
            ['password_hash'],
            ['teacher_id', teacher_id])

        if teacher_data[2] is None:
            return jsonify({'error': 'Teacher not found'}), 404

        (password_hash,) = teacher_data[2]

        if not auth.verify_password(current_password, password_hash):
            return jsonify({'error': 'Current password is incorrect'}), 401

        new_password_hash = auth.hash_password(new_password)
        db = dbase.get_db(_db)
        sql = dbase._s("""
            UPDATE teachers
            SET password_hash = %s, password_changed = TRUE
            WHERE teacher_id = %s
        """)
        db.execute(sql, (new_password_hash, teacher_id))
        db.commit()
        db.close()
        g.pop('db', None)

        # Invalidate the teacher's other live sessions so a session created under the
        # old password (e.g. one an attacker still holds) can't outlive the change.
        # Keep the current session so the teacher isn't logged out of this tab.
        auth.revoke_other_sessions('teacher', teacher_id, getattr(g, 'auth_session_id', None))

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/auth/student/add-email', methods=['POST'])
@auth.require_student()
@security.require_same_origin()
def student_add_email():
    """
    Student email logins are not supported.
    """
    return jsonify({'error': 'Student email addresses are not supported'}), 410


#---------------------------------------------------------------------------
# General Authentication
#---------------------------------------------------------------------------

@bp.route('/auth/logout', methods=['POST'])
@security.require_same_origin()
def logout():
    """
    Logout current user (teacher or student)
    Returns: {success: true}
    """
    user = auth.get_current_user()
    if user:
        security.log_auth_event('logout', user['user_type'], user['user_id'])
        # Best-effort: tear down this session's browser MQTT client so its credential
        # can't be reused and the dynsec store doesn't grow unbounded. Never let an MQTT
        # hiccup block logout.
        try:
            from server.common import mqtt, mqtt_dynsec
            if mqtt_dynsec.is_enabled():
                mqtt_dynsec.delete_browser_client(mqtt.server_session_for_user(user))
        except Exception:
            pass
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
        return security.server_error(e)


#---------------------------------------------------------------------------
# Class Management (Teachers Only)
#---------------------------------------------------------------------------

@bp.route('/classes/create', methods=['POST'])
@auth.require_teacher()
@security.require_same_origin()
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
        if len(class_name) > 100:
            return jsonify({'error': 'Class name must be at most 100 characters'}), 400
        if len(description) > 500:
            return jsonify({'error': 'Description must be at most 500 characters'}), 400

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

        # Record the creator as a member so co-teaching access checks are uniform.
        dbase.insert(_db, 'class_teachers',
            ['class_id', 'teacher_id', 'added_at'],
            (class_id, teacher_id, timestamp))

        return jsonify({
            'success': True,
            'class_id': class_id,
            'class_code': class_code,
            'message': 'Class created successfully'
        }), 201

    except Exception as e:
        return security.server_error(e)


@bp.route('/classes/my-classes', methods=['GET'])
@auth.require_teacher()
def get_my_classes():
    """
    Get all classes the current teacher owns or co-teaches
    Returns: {classes: [{class_id, class_name, class_code, description, created_at, student_count, is_owner}]}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Get the teacher's classes (owned or co-taught) with student counts.
        db = dbase.get_db(_db)
        # Match classes the teacher owns (classes.teacher_id) OR co-teaches (class_teachers).
        # The ownership arm keeps owned classes visible even if the class_teachers backfill
        # hasn't run yet on an upgraded database.
        sql = dbase._s("""
            SELECT c.class_id, c.class_name, c.class_code, c.description, c.created_at,
                   COUNT(DISTINCT e.enrollment_id) as student_count,
                   (c.teacher_id = %s) as is_owner
            FROM classes c
            LEFT JOIN class_teachers ct ON ct.class_id = c.class_id AND ct.teacher_id = %s
            LEFT JOIN enrollments e ON c.class_id = e.class_id AND e.is_active = TRUE
            WHERE c.is_active = TRUE AND (c.teacher_id = %s OR ct.teacher_id IS NOT NULL)
            GROUP BY c.class_id, c.class_name, c.class_code, c.description, c.created_at, c.teacher_id
            ORDER BY c.created_at DESC
        """)

        rows = db.execute(sql, (teacher_id, teacher_id, teacher_id)).fetchall()
        db.close()

        classes = []
        for row in rows:
            classes.append({
                'class_id': row[0],
                'class_name': row[1],
                'class_code': row[2],
                'description': row[3],
                'created_at': row[4],
                'student_count': row[5],
                'is_owner': bool(row[6])
            })

        return jsonify({'classes': classes}), 200

    except Exception as e:
        return security.server_error(e)


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

        # Verify teacher owns or co-teaches this class
        class_data = dbase.fetch(_db, 'classes',
            ['class_id', 'class_name', 'class_code', 'description', 'created_at', 'teacher_id'],
            ['class_id', class_id])

        if class_data[2] is None:
            return jsonify({'error': 'Class not found'}), 404

        owner_id = class_data[2][5]
        if owner_id != teacher_id and not auth.teacher_class_access(_db, teacher_id, class_id):
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'class_id': class_data[2][0],
            'class_name': class_data[2][1],
            'class_code': class_data[2][2],
            'description': class_data[2][3],
            'created_at': class_data[2][4],
            'is_owner': owner_id == teacher_id
        }), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/classes/<int:class_id>', methods=['DELETE'])
@auth.require_teacher()
@security.require_same_origin()
def delete_class(class_id):
    """
    Delete (deactivate) a class
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns or co-teaches this class
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        # Soft delete
        db = dbase.get_db(_db)
        sql = dbase._s("UPDATE classes SET is_active = FALSE WHERE class_id = %s")
        db.execute(sql, (class_id,))
        db.commit()
        db.close()

        return jsonify({'success': True, 'message': 'Class deleted successfully'}), 200

    except Exception as e:
        return security.server_error(e)


#---------------------------------------------------------------------------
# Student Management (Teachers Only)
#---------------------------------------------------------------------------

@bp.route('/classes/<int:class_id>/students/search', methods=['POST'])
@auth.require_teacher()
@security.require_same_origin()
def search_students(class_id):
    """
    Search for existing students by name
    POST body: {search_query}
    Returns: {students: [{student_id, student_name, created_at}]} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # The teacher must own or co-teach the class they are searching to add students to.
        # Students themselves are a school-wide shared directory (the same student account
        # can be taught by several teachers), so the search below is intentionally not
        # scoped to the requesting teacher.
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        obj = request.json
        search_query = obj.get('search_query', '').strip()

        if not search_query or len(search_query) < 2:
            return jsonify({'students': []}), 200

        # Search the shared student directory by name (case-insensitive partial match).
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
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/students/create', methods=['POST'])
@auth.require_teacher()
@security.require_same_origin()
def create_student_and_enroll(class_id):
    """
    Create a new student and enroll in class
    POST body: {student_name}
    Returns: {success: true, student_id, initial_password} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns or co-teaches this class
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        obj = request.json
        student_name = obj.get('student_name', '').strip()

        if not student_name:
            return jsonify({'error': 'Student name is required'}), 400
        if len(student_name) > 100:
            return jsonify({'error': 'Student name must be at most 100 characters'}), 400

        # Reject a duplicate active username within the same class so class-code login
        # (class_code + name + password) stays unambiguous.
        db = dbase.get_db(_db)
        dup_sql = dbase._s("""
            SELECT 1
            FROM students s
            JOIN enrollments e ON s.student_id = e.student_id
            WHERE e.class_id = %s
            AND e.is_active = TRUE
            AND s.is_active = TRUE
            AND LOWER(s.student_name) = LOWER(%s)
            LIMIT 1
        """)
        if db.execute(dup_sql, (class_id, student_name)).fetchone() is not None:
            db.close()
            g.pop('db', None)
            return jsonify({'error': 'A student with that name already exists in this class'}), 409

        # Generate initial password
        initial_password = auth.generate_initial_password()
        password_hash = auth.hash_password(initial_password)
        # Store the one-time code encrypted at rest so the teacher can re-view it until
        # the student first changes their password (wiped on change-password).
        initial_password_enc = auth.encrypt_initial_password(initial_password)
        timestamp = auth.get_timestamp()

        # Create student and get the new student_id via RETURNING
        db = dbase.get_db(_db)
        sql = dbase._s("""
            INSERT INTO students (student_name, password_hash, password_changed, initial_password_enc, created_at, created_by_teacher_id)
            VALUES (%s, %s, FALSE, %s, %s, %s)
            RETURNING student_id
        """)
        result = db.execute(sql, (student_name, password_hash, initial_password_enc, timestamp, teacher_id)).fetchone()
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
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/students/add', methods=['POST'])
@auth.require_teacher()
@security.require_same_origin()
def add_existing_student(class_id):
    """
    Add an existing student to class
    POST body: {student_id}
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns or co-teaches this class
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        obj = request.json
        student_id = obj.get('student_id')

        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400

        # Students are a school-wide shared directory, so any teacher may enroll any
        # existing (active) student into a class they own. The class-ownership check above
        # is what gates this endpoint; we only confirm the student exists here.
        student_data = dbase.fetch(_db, 'students', ['is_active'], ['student_id', student_id])
        if student_data[2] is None:
            return jsonify({'error': 'Student not found'}), 404
        if not student_data[2][0]:
            return jsonify({'error': 'Student account is disabled'}), 403

        # Use a single connection for the duplicate-check and the insert (the dbase.insert
        # helper would close the connection out from under us, leaving a stale handle).
        timestamp = auth.get_timestamp()
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT enrollment_id, is_active FROM enrollments
            WHERE class_id = %s AND student_id = %s
        """)
        existing = db.execute(sql, (class_id, student_id)).fetchone()

        if existing is not None:
            enrollment_id, is_active = existing
            if is_active:
                db.close()
                g.pop('db', None)
                return jsonify({'error': 'Student already enrolled in this class'}), 409
            # Removing a student soft-deletes the enrollment (is_active = FALSE), and the
            # UNIQUE(class_id, student_id) constraint means we must reactivate that row
            # rather than insert a new one.
            db.execute(dbase._s("""
                UPDATE enrollments SET is_active = TRUE, enrolled_at = %s
                WHERE enrollment_id = %s
            """), (timestamp, enrollment_id))
        else:
            db.execute(dbase._s("""
                INSERT INTO enrollments (class_id, student_id, enrolled_at)
                VALUES (%s, %s, %s)
            """), (class_id, student_id, timestamp))
        db.commit()
        db.close()
        g.pop('db', None)

        return jsonify({
            'success': True,
            'message': 'Student added to class successfully'
        }), 201

    except Exception as e:
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/students/<int:student_id>', methods=['DELETE'])
@auth.require_teacher()
@security.require_same_origin()
def remove_student_from_class(class_id, student_id):
    """
    Remove a student from class
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns or co-teaches this class
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
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
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/students/<int:student_id>/account', methods=['DELETE'])
@auth.require_teacher()
@security.require_same_origin()
def delete_student_account(class_id, student_id):
    """
    Permanently delete a student ACCOUNT and all their data — distinct from removing them
    from a single class. ON DELETE CASCADE removes their enrollments (in every class) and
    their projects. Because students are a school-wide shared directory, this also affects
    any other class the student belonged to.

    Allowed for a teacher with access to a class the student is (or was) enrolled in, so a
    teacher can only delete accounts they actually manage.
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        db = dbase.get_db(_db)
        # The student must be linked to this class (active or previously removed) so a
        # teacher cannot delete arbitrary accounts they have no relationship with.
        link = db.execute(dbase._s("""
            SELECT 1 FROM enrollments WHERE class_id = %s AND student_id = %s
        """), (class_id, student_id)).fetchone()
        if link is None:
            db.close()
            g.pop('db', None)
            return jsonify({'error': 'Student is not part of this class'}), 404

        # Hard delete; enrollments + projects cascade via ON DELETE CASCADE.
        db.execute(dbase._s("DELETE FROM students WHERE student_id = %s"), (student_id,))
        db.commit()
        db.close()
        g.pop('db', None)

        return jsonify({'success': True, 'message': 'Student account deleted'}), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/students', methods=['GET'])
@auth.require_teacher()
def get_class_students(class_id):
    """
    Get all students in a class
    Returns: {students: [{student_id, student_name, password_changed, enrolled_at}]} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns or co-teaches this class
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get students in class. For students who haven't finished setup yet, decrypt and
        # return their one-time code inline so the teacher can read it straight from the
        # list. This is the same teacher and the same authorisation as the dedicated code
        # endpoint, so it exposes nothing new; the code is wiped once the student sets
        # their own password (password_changed = TRUE), after which we never return it.
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT s.student_id, s.student_name, s.password_changed, e.enrolled_at,
                   s.initial_password_enc
            FROM students s
            JOIN enrollments e ON s.student_id = e.student_id
            WHERE e.class_id = %s AND e.is_active = TRUE
            ORDER BY e.enrolled_at DESC
        """)

        rows = db.execute(sql, (class_id,)).fetchall()
        db.close()

        students = []
        for row in rows:
            student_id, student_name, password_changed, enrolled_at, initial_password_enc = row

            initial_password = None
            if not password_changed and initial_password_enc:
                initial_password = auth.decrypt_initial_password(initial_password_enc)

            students.append({
                'student_id': student_id,
                'student_name': student_name,
                'password_changed': password_changed,
                'enrolled_at': enrolled_at,
                'has_initial_code': initial_password is not None,
                'initial_password': initial_password
            })

        return jsonify({'students': students}), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/students/<int:student_id>/code', methods=['GET'])
@auth.require_teacher()
def get_student_initial_code(class_id, student_id):
    """
    Re-view a student's one-time initial password.
    Only available to the teacher who owns the class the student is enrolled in, and only
    until the student first changes their password (after which the code is wiped).
    Returns: {initial_password} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        # Verify teacher owns or co-teaches this class
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        # Verify the student is actively enrolled in this class, and pull the code.
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT s.password_changed, s.initial_password_enc
            FROM students s
            JOIN enrollments e ON s.student_id = e.student_id
            WHERE s.student_id = %s AND e.class_id = %s
              AND e.is_active = TRUE AND s.is_active = TRUE
            LIMIT 1
        """)
        row = db.execute(sql, (student_id, class_id)).fetchone()
        db.close()
        g.pop('db', None)

        if row is None:
            return jsonify({'error': 'Student not found in this class'}), 404

        password_changed, initial_password_enc = row

        if password_changed or not initial_password_enc:
            # The student has already set their own password — there is no code to show.
            return jsonify({'error': 'No initial code available; the student has already changed their password'}), 410

        initial_password = auth.decrypt_initial_password(initial_password_enc)
        if initial_password is None:
            # Token unreadable (e.g. after a pepper rotation) — treat as gone.
            return jsonify({'error': 'Initial code is no longer recoverable'}), 410

        return jsonify({'initial_password': initial_password}), 200

    except Exception as e:
        return security.server_error(e)


#---------------------------------------------------------------------------
# Co-teachers
#---------------------------------------------------------------------------

@bp.route('/classes/<int:class_id>/teachers', methods=['GET'])
@auth.require_teacher()
def get_class_teachers(class_id):
    """
    List the teachers (owner + co-teachers) on a class.
    Any teacher on the class may view the list.
    Returns: {teachers: [{teacher_id, full_name, email, is_owner, is_self}]} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        # Owner is recorded on classes.teacher_id; everyone (incl. owner) is in class_teachers.
        owner_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])
        owner_id = owner_data[2][0] if owner_data[2] else None

        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT t.teacher_id, t.full_name, t.email, ct.added_at
            FROM class_teachers ct
            JOIN teachers t ON t.teacher_id = ct.teacher_id
            WHERE ct.class_id = %s AND t.is_active = TRUE
            ORDER BY (t.teacher_id = %s) DESC, ct.added_at ASC
        """)
        rows = db.execute(sql, (class_id, owner_id)).fetchall()
        db.close()

        teachers = []
        for row in rows:
            teachers.append({
                'teacher_id': row[0],
                'full_name': row[1],
                'email': row[2],
                'is_owner': row[0] == owner_id,
                'is_self': row[0] == teacher_id
            })

        return jsonify({'teachers': teachers}), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/teachers', methods=['POST'])
@auth.require_teacher()
@security.require_same_origin()
def add_co_teacher(class_id):
    """
    Add a co-teacher to a class by email. Any teacher on the class may add others.
    POST body: {email}
    Returns: {success: true, teacher: {...}} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        obj = request.json or {}
        email = (obj.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'Teacher email is required'}), 400

        # Look up the teacher to add. Email is stored as entered; match case-insensitively.
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT teacher_id, full_name, email
            FROM teachers
            WHERE LOWER(email) = %s AND is_active = TRUE
            LIMIT 1
        """)
        target = db.execute(sql, (email,)).fetchone()
        if target is None:
            db.close()
            g.pop('db', None)
            return jsonify({'error': 'No teacher found with that email'}), 404

        target_id, target_name, target_email = target

        # Already on the class?
        exists = db.execute(dbase._s(
            "SELECT 1 FROM class_teachers WHERE class_id = %s AND teacher_id = %s"
        ), (class_id, target_id)).fetchone()
        if exists is not None:
            db.close()
            g.pop('db', None)
            return jsonify({'error': 'That teacher is already on this class'}), 409

        timestamp = auth.get_timestamp()
        db.execute(dbase._s(
            "INSERT INTO class_teachers (class_id, teacher_id, added_at) VALUES (%s, %s, %s)"
        ), (class_id, target_id, timestamp))
        db.commit()

        owner_data = dbase.fetch(_db, 'classes', ['teacher_id'], ['class_id', class_id])
        owner_id = owner_data[2][0] if owner_data[2] else None

        return jsonify({
            'success': True,
            'teacher': {
                'teacher_id': target_id,
                'full_name': target_name,
                'email': target_email,
                'is_owner': target_id == owner_id,
                'is_self': target_id == teacher_id
            }
        }), 201

    except Exception as e:
        return security.server_error(e)


@bp.route('/classes/<int:class_id>/teachers/<int:target_teacher_id>', methods=['DELETE'])
@auth.require_teacher()
@security.require_same_origin()
def remove_co_teacher(class_id, target_teacher_id):
    """
    Remove a teacher from a class. Any teacher on the class may remove another (full
    parity). The class's last remaining teacher cannot be removed (would orphan it).
    Returns: {success: true} or {error}
    """
    try:
        user = auth.get_current_user()
        teacher_id = user['user_id']

        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
            return jsonify({'error': 'Unauthorized'}), 403

        db = dbase.get_db(_db)

        # Target must currently be on the class.
        present = db.execute(dbase._s(
            "SELECT 1 FROM class_teachers WHERE class_id = %s AND teacher_id = %s"
        ), (class_id, target_teacher_id)).fetchone()
        if present is None:
            db.close()
            g.pop('db', None)
            return jsonify({'error': 'That teacher is not on this class'}), 404

        # Never leave a class with no teachers.
        count_row = db.execute(dbase._s(
            "SELECT COUNT(*) FROM class_teachers WHERE class_id = %s"
        ), (class_id,)).fetchone()
        if count_row and count_row[0] <= 1:
            db.close()
            g.pop('db', None)
            return jsonify({'error': 'Cannot remove the only teacher on the class'}), 409

        # Read the recorded owner on the same connection (avoid dbase.fetch here — it would
        # close the connection mid-transaction and discard the DELETE below).
        owner_row = db.execute(dbase._s(
            "SELECT teacher_id FROM classes WHERE class_id = %s"
        ), (class_id,)).fetchone()
        owner_id = owner_row[0] if owner_row else None

        db.execute(dbase._s(
            "DELETE FROM class_teachers WHERE class_id = %s AND teacher_id = %s"
        ), (class_id, target_teacher_id))

        # If we removed the recorded owner, hand ownership to the next-oldest remaining
        # teacher so classes.teacher_id always points at a real member.
        if owner_id == target_teacher_id:
            next_owner = db.execute(dbase._s(
                "SELECT teacher_id FROM class_teachers WHERE class_id = %s ORDER BY added_at ASC LIMIT 1"
            ), (class_id,)).fetchone()
            if next_owner is not None:
                db.execute(dbase._s(
                    "UPDATE classes SET teacher_id = %s WHERE class_id = %s"
                ), (next_owner[0], class_id))

        db.commit()
        db.close()
        g.pop('db', None)

        return jsonify({'success': True, 'message': 'Teacher removed from class'}), 200

    except Exception as e:
        return security.server_error(e)


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
        return security.server_error(e)


#---------------------------------------------------------------------------
# Projects
#---------------------------------------------------------------------------

@bp.route('/projects/save', methods=['POST'])
@auth.require_login()
@security.require_same_origin()
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

            student_owner, teacher_owner = result

            # Ownership is REQUIRED to overwrite. We used to silently ADOPT a row with no
            # owner (a pre-per-user-ownership "legacy" row) to whoever saved first AND
            # overwrite its contents — that let any logged-in user claim and clobber
            # another author's project just by guessing its uid. We no longer adopt on
            # write: an unowned (NULL) or other-owned row is refused. Genuine legacy rows
            # must be assigned owners by a one-time backfill migration (operator task),
            # never by a client save.
            owner = student_owner if user_type == 'student' else teacher_owner
            if owner is None or owner != user_id:
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
        return security.server_error(e)


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
                SELECT uid, name, assigned_class_id, created_at, last_edited,
                       share_uid, share_token, shared_public, shared_class_id
                FROM projects
                WHERE student_id = %s
                ORDER BY last_edited DESC
            """)
        else:  # teacher
            sql = dbase._s("""
                SELECT uid, name, assigned_class_id, created_at, last_edited,
                       share_uid, share_token, shared_public, shared_class_id
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
                'last_edited': row[4],
                'share_uid': row[5],
                'share_token': row[6],
                'shared_public': row[7],
                'shared_class_id': row[8]
            })

        return jsonify({'projects': projects}), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/projects/<string:uid>/assign-class', methods=['POST'])
@auth.require_student()
@security.require_same_origin()
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
        return security.server_error(e)


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

        # Verify teacher owns or co-teaches this class
        access = auth.teacher_class_access(_db, teacher_id, class_id)
        if access is None:
            return jsonify({'error': 'Class not found'}), 404
        if not access:
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
        return security.server_error(e)


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
            SELECT student_id, teacher_id, name, data, created_at, last_edited,
                   share_uid, share_token, shared_public, shared_class_id
            FROM projects WHERE uid = %s
        """)
        result = db.execute(sql, (uid,)).fetchone()
        db.close()

        if result is None:
            return jsonify({'error': 'Project not found'}), 404

        student_id, teacher_id, name, data, created_at, last_edited, share_uid, share_token, shared_public, shared_class_id = result

        if user_type == 'student' and student_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        if user_type == 'teacher' and teacher_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'uid': uid,
            'name': name,
            'data': json.loads(data) if data else {},
            'created_at': created_at,
            'last_edited': last_edited,
            'share_uid': share_uid,
            'share_token': share_token,
            'shared_public': shared_public,
            'shared_class_id': shared_class_id
        }), 200

    except Exception as e:
        return security.server_error(e)


@bp.route('/projects/<string:uid>', methods=['DELETE'])
@auth.require_login()
@security.require_same_origin()
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
        return security.server_error(e)


@bp.route('/projects/migrate', methods=['POST'])
@auth.require_login()
@security.require_same_origin()
@auth.rate_limit(limit=10, window_seconds=600)
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
        # Bound the per-request work: each item does a SELECT + INSERT, so an unbounded
        # array is a cheap self-service DoS / write-amplification on the 1-vCPU box.
        if len(projects) > 200:
            return jsonify({'error': 'Too many projects in one request (max 200)'}), 400

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
        return security.server_error(e)
