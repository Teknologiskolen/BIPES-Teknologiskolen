"""
Core authentication module for BIPES
Provides password hashing, session management, and utility functions
"""

from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import session, jsonify
import random
import string
import time

#------------------------------------------------------------------------
# Password Management
#------------------------------------------------------------------------

def hash_password(password):
    """
    Hash a password using bcrypt via werkzeug

    Args:
        password (str): Plain text password

    Returns:
        str: Hashed password
    """
    return generate_password_hash(password, method='pbkdf2:sha256')


def verify_password(password, password_hash):
    """
    Verify a password against its hash

    Args:
        password (str): Plain text password to verify
        password_hash (str): Stored password hash

    Returns:
        bool: True if password matches, False otherwise
    """
    return check_password_hash(password_hash, password)


def generate_initial_password():
    """
    Generate a random initial password for students
    Format: 8 characters (letters + numbers, easy to type)

    Returns:
        str: Random password (e.g., "Xy7k2Lm9")
    """
    # Mix of uppercase, lowercase, and digits for readability
    chars = string.ascii_uppercase + string.ascii_lowercase + string.digits
    # Ensure at least one of each type
    password = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits)
    ]
    # Fill the rest randomly
    password += [random.choice(chars) for _ in range(5)]
    # Shuffle to mix them up
    random.shuffle(password)
    return ''.join(password)


#------------------------------------------------------------------------
# Class Code Generation
#------------------------------------------------------------------------

def generate_class_code():
    """
    Generate a unique class code
    Format: ABC123XY (3 uppercase letters + 3 digits + 2 uppercase letters)

    Returns:
        str: 8-character class code
    """
    letters_1 = ''.join(random.choices(string.ascii_uppercase, k=3))
    digits = ''.join(random.choices(string.digits, k=3))
    letters_2 = ''.join(random.choices(string.ascii_uppercase, k=2))
    return f"{letters_1}{digits}{letters_2}"


#------------------------------------------------------------------------
# Session Management
#------------------------------------------------------------------------

def get_current_user():
    """
    Get the current logged-in user from session

    Returns:
        dict: User info with keys: user_id, user_type ('teacher' or 'student'), email/name
        None: If not logged in
    """
    if 'user_id' in session and 'user_type' in session:
        return {
            'user_id': session['user_id'],
            'user_type': session['user_type'],
            'name': session.get('name'),
            'email': session.get('email')
        }
    return None


def set_user_session(user_id, user_type, name, email=None):
    """
    Set user session data after successful login

    Args:
        user_id (int): User ID (teacher_id or student_id)
        user_type (str): 'teacher' or 'student'
        name (str): Full name or student name
        email (str, optional): Email address (may be None for students)
    """
    session['user_id'] = user_id
    session['user_type'] = user_type
    session['name'] = name
    session['email'] = email
    session['login_time'] = time.time()


def clear_user_session():
    """
    Clear user session (logout)
    """
    session.clear()


def is_authenticated():
    """
    Check if a user is currently authenticated

    Returns:
        bool: True if user is logged in, False otherwise
    """
    return 'user_id' in session and 'user_type' in session


#------------------------------------------------------------------------
# Decorators for Route Protection
#------------------------------------------------------------------------

def require_login():
    """
    Decorator to require user to be logged in

    Usage:
        @app.route('/protected')
        @require_login()
        def protected_route():
            return "You are logged in!"
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not is_authenticated():
                return jsonify({'error': 'Authentication required'}), 401
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_teacher():
    """
    Decorator to require user to be a teacher

    Usage:
        @app.route('/teacher-only')
        @require_teacher()
        def teacher_route():
            return "You are a teacher!"
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user or user['user_type'] != 'teacher':
                return jsonify({'error': 'Teacher access required'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_student():
    """
    Decorator to require user to be a student

    Usage:
        @app.route('/student-only')
        @require_student()
        def student_route():
            return "You are a student!"
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user or user['user_type'] != 'student':
                return jsonify({'error': 'Student access required'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


#------------------------------------------------------------------------
# Utility Functions
#------------------------------------------------------------------------

def get_timestamp():
    """
    Get current Unix timestamp (numeric with 6 decimal places)
    Matches the database timestamp format

    Returns:
        float: Current timestamp
    """
    return time.time()


def validate_password_strength(password):
    """
    Validate password meets minimum requirements

    Args:
        password (str): Password to validate

    Returns:
        tuple: (bool, str) - (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    # Optional: Add more strength requirements here
    # has_upper = any(c.isupper() for c in password)
    # has_lower = any(c.islower() for c in password)
    # has_digit = any(c.isdigit() for c in password)

    return True, ""


def validate_email(email):
    """
    Basic email validation

    Args:
        email (str): Email to validate

    Returns:
        bool: True if email format is valid
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None
