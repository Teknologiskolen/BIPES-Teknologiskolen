"""
Permission helpers for resource-level authorization.

These helpers are intended to be called inside protected routes after a broad
authentication decorator such as @auth.require_login().
"""

from server.common import database as dbase


def _viewer_columns_for_user(user):
    if not user:
        return None, None

    if user['user_type'] == 'teacher':
        return 'viewer_teacher_id', 'owner_teacher_id'
    if user['user_type'] == 'student':
        return 'viewer_student_id', 'owner_student_id'
    return None, None


def count_user_devices(user):
    """
    Count the total number of devices a user can access, including both owned
    and viewed devices.
    """
    if not user:
      return 0

    viewer_col, owner_col = _viewer_columns_for_user(user)
    if not viewer_col or not owner_col:
      return 0

    if not dbase.has_table('API', ('devices',)):
      return 0

    db = dbase.get_db('API')
    user_id = user['user_id']

    owned_sql = dbase._s(f"SELECT COUNT(*) FROM devices WHERE {owner_col} = %s AND is_active = TRUE")
    owned_count = db.execute(owned_sql, (user_id,)).fetchone()[0]

    viewer_count = 0
    if dbase.has_table('API', ('device_viewers',)):
      viewer_sql = dbase._s(
        f"SELECT COUNT(*) FROM device_viewers WHERE {viewer_col} = %s"
      )
      viewer_count = db.execute(viewer_sql, (user_id,)).fetchone()[0]

    db.close()
    return owned_count + viewer_count


def can_control_device(user, device_id):
    """
    Only the device owner can control it.
    """
    if not user or not device_id:
      return False

    _, owner_col = _viewer_columns_for_user(user)
    if not owner_col or not dbase.has_table('API', ('devices',)):
      return False

    row = dbase.fetch('API', 'devices', [owner_col, 'is_active'], ['device_id', device_id])[2]
    return row is not None and row[1] is True and row[0] == user['user_id']


def can_view_device(user, device_id):
    """
    Owners and viewers can receive/read device data.
    """
    if can_control_device(user, device_id):
      return True

    if not user or not device_id or not dbase.has_table('API', ('device_viewers',)):
      return False

    viewer_col, _ = _viewer_columns_for_user(user)
    if not viewer_col:
      return False

    db = dbase.get_db('API')
    sql = dbase._s(f"SELECT 1 FROM device_viewers WHERE device_id = %s AND {viewer_col} = %s")
    row = db.execute(sql, (device_id, user['user_id'])).fetchone()
    db.close()
    return row is not None


def can_manage_device(user, device_id):
    """
    Managing sharing/pairing/device metadata is owner-only in the current
    permission model.
    """
    return can_control_device(user, device_id)
