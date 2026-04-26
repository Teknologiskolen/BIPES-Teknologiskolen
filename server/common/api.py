from flask import Blueprint, jsonify, request
import json

from server.common import auth
from server.common import database as dbase
from server.common import security

#--------------------------------------------------------------------------
# Blueprint
bp = Blueprint('api', __name__, url_prefix='/api')
_db = 'API'


def _share_list_query(user, from_ts=None, limit=None):
    params = []

    if user['user_type'] == 'teacher':
        sql = """
            SELECT p.share_uid,
                   COALESCE(NULLIF(p.author, 'a user'), t.full_name, p.author),
                   p.name,
                   p.last_edited,
                   t.full_name,
                   NULL AS class_id,
                   NULL AS class_name,
                   NULL AS class_code
            FROM projects p
            LEFT JOIN teachers t ON t.teacher_id = p.teacher_id
            WHERE p.teacher_id IS NOT NULL
              AND p.shared_public = TRUE
              AND p.share_uid IS NOT NULL
        """
    else:
        sql = """
            SELECT DISTINCT p.share_uid,
                   COALESCE(NULLIF(p.author, 'a user'), t.full_name, p.author),
                   p.name,
                   p.last_edited,
                   t.full_name,
                   c.class_id,
                   c.class_name,
                   c.class_code
            FROM projects p
            LEFT JOIN teachers t ON t.teacher_id = p.teacher_id
            JOIN classes c
              ON c.class_id = p.shared_class_id
            JOIN enrollments e
              ON e.class_id = p.shared_class_id
             AND e.student_id = %s
             AND e.is_active = TRUE
            WHERE p.shared_class_id IS NOT NULL
              AND p.share_uid IS NOT NULL
        """
        params.append(user['user_id'])

    if from_ts is not None:
        sql += " AND p.last_edited < %s"
        params.append(from_ts)

    sql += " ORDER BY p.last_edited DESC"

    if limit is not None:
        sql += " LIMIT %s"
        params.append(limit)

    return dbase._s(sql), tuple(params)


def _can_access_shared_project(user, teacher_id, shared_public, shared_class_id):
    if user['user_type'] == 'teacher':
        return bool(shared_public) or teacher_id == user['user_id']

    if not shared_class_id:
        return False

    db = dbase.get_db(_db)
    sql = dbase._s("""
        SELECT 1
        FROM enrollments
        WHERE class_id = %s AND student_id = %s AND is_active = TRUE
    """)
    result = db.execute(sql, (shared_class_id, user['user_id'])).fetchone()
    db.close()
    return result is not None


def _upsert_share(user, obj):
    if user['user_type'] != 'teacher':
        return jsonify({'error': 'Teacher access required'}), 403

    project_uid = obj.get('project_uid')
    if not project_uid:
        return jsonify({'error': 'project_uid is required'}), 400

    shared_public = bool(obj.get('shared_public', False))
    shared_class_id = obj.get('shared_class_id')
    if shared_class_id == '':
        shared_class_id = None
    elif shared_class_id is not None:
        try:
            shared_class_id = int(shared_class_id)
        except (TypeError, ValueError):
            return jsonify({'error': 'shared_class_id must be an integer'}), 400

    data = obj.get('data', {})
    name = obj.get('name') or data.get('project', {}).get('name') or 'Untitled Project'
    author = data.get('project', {}).get('author')
    if not author or author == 'a user':
        author = user.get('name') or 'a user'

    db = dbase.get_db(_db)
    if shared_class_id is not None:
        sql = dbase._s("""
            SELECT class_id
            FROM classes
            WHERE class_id = %s AND teacher_id = %s AND is_active = TRUE
        """)
        class_row = db.execute(sql, (shared_class_id, user['user_id'])).fetchone()
        if class_row is None:
            db.close()
            return jsonify({'error': 'Class not found or unauthorized'}), 403

    sql = dbase._s("""
        SELECT uid, teacher_id, share_uid, share_token
        FROM projects
        WHERE uid = %s
    """)
    row = db.execute(sql, (project_uid,)).fetchone()

    if row is None:
        timestamp = auth.get_timestamp()
        share_uid = dbase.uid(12)
        share_token = dbase.uid(18)
        sql = dbase._s("""
            INSERT INTO projects
            (uid, teacher_id, name, author, data, created_at, last_edited,
             share_uid, share_token, shared_public, shared_class_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """)
        db.execute(sql, (
            project_uid,
            user['user_id'],
            name,
            author,
            json.dumps(data),
            timestamp,
            timestamp,
            share_uid,
            share_token,
            shared_public,
            shared_class_id
        ))
    else:
        _, teacher_id, share_uid, share_token = row
        if teacher_id != user['user_id']:
            db.close()
            return jsonify({'error': 'Unauthorized'}), 403

        if not share_uid:
            share_uid = dbase.uid(12)
        if not share_token:
            share_token = dbase.uid(18)

        sql = dbase._s("""
            UPDATE projects
            SET share_uid = %s,
                share_token = %s,
                shared_public = %s,
                shared_class_id = %s,
                name = %s,
                author = %s,
                data = %s
            WHERE uid = %s
        """)
        db.execute(sql, (
            share_uid,
            share_token,
            shared_public,
            shared_class_id,
            name,
            author,
            json.dumps(data),
            project_uid
        ))

    db.commit()
    db.close()

    return jsonify({
        'uid': share_uid,
        'token': share_token,
        'shared_public': shared_public,
        'shared_class_id': shared_class_id
    }), 200


#---------------------------------------------------------------------------
# Shared project handlers

@bp.route('/project/ls', methods=('POST', 'GET'))
@auth.require_teacher_or_student()
def project_ls():
    user = auth.get_current_user()
    obj = request.json or {}
    from_ts = obj.get('from')
    limit = obj.get('limit')

    try:
        db = dbase.get_db(_db)
        sql, params = _share_list_query(user, from_ts, limit)
        rows = db.execute(sql, params).fetchall()
        db.close()

        projects = [{
            'uid': row[0],
            'author': row[1],
            'name': row[2],
            'lastEdited': row[3],
            'teacher_name': row[4],
            'class_id': row[5],
            'class_name': row[6],
            'class_code': row[7],
        } for row in rows]
        return jsonify({'projects': projects}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/project/o', methods=('GET', 'POST'))
@auth.require_teacher_or_student()
def project_o():
    user = auth.get_current_user()
    obj = request.json or {}
    share_uid = obj.get('uid')

    if not share_uid:
        return jsonify({'error': 'uid is required'}), 400

    try:
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT p.share_uid,
                   COALESCE(NULLIF(p.author, 'a user'), t.full_name, p.author),
                   p.name,
                   p.last_edited,
                   p.data,
                   p.teacher_id,
                   p.shared_public,
                   p.shared_class_id,
                   t.full_name,
                   c.class_name,
                   c.class_code
            FROM projects p
            LEFT JOIN teachers t ON t.teacher_id = p.teacher_id
            LEFT JOIN classes c ON c.class_id = p.shared_class_id
            WHERE p.share_uid = %s
        """)
        row = db.execute(sql, (share_uid,)).fetchone()
        db.close()

        if row is None:
            return jsonify({}), 200

        (
            _,
            author,
            name,
            last_edited,
            data,
            teacher_id,
            shared_public,
            shared_class_id,
            teacher_name,
            class_name,
            class_code,
        ) = row
        if not _can_access_shared_project(user, teacher_id, shared_public, shared_class_id):
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'projects': [{
                'uid': share_uid,
                'author': author,
                'name': name,
                'lastEdited': last_edited,
                'data': json.loads(data) if data else {},
                'teacher_name': teacher_name,
                'class_id': shared_class_id,
                'class_name': class_name,
                'class_code': class_code,
                'shared_public': shared_public,
            }]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/project/cp', methods=('GET', 'POST'))
@auth.require_teacher()
@security.require_same_origin()
def project_cp():
    obj = request.json or {}
    user = auth.get_current_user()
    return _upsert_share(user, obj)


@bp.route('/project/rm', methods=('GET', 'POST'))
@auth.require_teacher()
@security.require_same_origin()
def project_rm():
    obj = request.json or {}
    user = auth.get_current_user()
    project_uid = obj.get('project_uid')

    if not project_uid:
        return jsonify({'error': 'project_uid is required'}), 400

    try:
        db = dbase.get_db(_db)
        sql = dbase._s("""
            SELECT teacher_id
            FROM projects
            WHERE uid = %s
        """)
        row = db.execute(sql, (project_uid,)).fetchone()
        if row is None:
            db.close()
            return jsonify({'error': 'Project not found'}), 404
        if row[0] != user['user_id']:
            db.close()
            return jsonify({'error': 'Unauthorized'}), 403

        sql = dbase._s("""
            UPDATE projects
            SET share_uid = NULL,
                share_token = NULL,
                shared_public = FALSE,
                shared_class_id = NULL
            WHERE uid = %s
        """)
        db.execute(sql, (project_uid,))
        db.commit()
        db.close()

        return jsonify({'uid': project_uid}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/project/w', methods=('GET', 'POST'))
@auth.require_teacher()
@security.require_same_origin()
def project_w():
    obj = request.json or {}
    user = auth.get_current_user()
    return _upsert_share(user, obj)
