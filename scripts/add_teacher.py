#!/usr/bin/env python3
"""Create a teacher account from the server side. Teachers cannot self-register.

Run it inside the running web container:

  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec web python scripts/add_teacher.py "teacher@school.dk" "Full Name" [password]

If no password is given, a strong one is generated and printed. The new teacher is
forced to change it on first login (password_changed = FALSE), exactly like students.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from server.common import auth
from server.common import database as dbase


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2

    email = argv[1].strip().lower()
    full_name = argv[2].strip()
    password = argv[3] if len(argv) > 3 else auth.generate_initial_password()

    if not auth.validate_email(email):
        print(f"Invalid email address: {email}")
        return 1
    if not full_name:
        print("Full name is required.")
        return 1
    ok, msg = auth.validate_password_strength(password)
    if not ok:
        print(f"Password rejected: {msg}")
        return 1

    app = create_app("postgresql")
    with app.app_context():
        existing = dbase.fetch("API", "teachers", ["teacher_id"], ["email", email])
        if existing[2] is not None:
            print(f"A teacher with email {email} already exists (id {existing[2][0]}).")
            return 1

        password_hash = auth.hash_password(password)
        dbase.insert(
            "API",
            "teachers",
            ["email", "password_hash", "full_name", "created_at", "password_changed"],
            (email, password_hash, full_name, auth.get_timestamp(), False),
        )
        teacher_id = dbase.fetch("API", "teachers", ["teacher_id"], ["email", email])[2][0]

    print("Teacher account created:")
    print(f"  id:       {teacher_id}")
    print(f"  email:    {email}")
    print(f"  name:     {full_name}")
    print(f"  password: {password}")
    print("Give these credentials to the teacher; they must change the password on first login.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
