"""Team account management. The only way accounts are created, reset or deactivated.

Run it inside the deployed environment (never from a laptop against the production DB):
    docker compose exec backend python scripts/manage_users.py list
"""

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.errors import ServiceError  # noqa: E402
from app.core.logging import setup_logging  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.services import users  # noqa: E402


def _prompt_password() -> str:
    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Confirm password: "):
        raise ServiceError(422, "Passwords do not match")
    return password


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create", help="create a team member")
    create.add_argument("--name", required=True)
    create.add_argument("--email", required=True)

    reset = sub.add_parser("reset-password", help="set a new password for a team member")
    reset.add_argument("--email", required=True)

    deactivate = sub.add_parser("deactivate", help="block a team member from logging in")
    deactivate.add_argument("--email", required=True)

    sub.add_parser("list", help="list team members")

    args = parser.parse_args(argv)
    setup_logging()

    try:
        with SessionLocal() as db:
            if args.command == "create":
                user = users.create_user(db, args.name, args.email, _prompt_password())
                db.commit()
                print(f"Created {user.email} (id {user.id})")
            elif args.command == "reset-password":
                user = users.reset_password(db, args.email, _prompt_password())
                db.commit()
                print(f"Password reset for {user.email}")
            elif args.command == "deactivate":
                user = users.deactivate_user(db, args.email)
                db.commit()
                print(f"Deactivated {user.email}")
            else:
                for u in users.list_users(db):
                    state = "active" if u.is_active else "inactive"
                    print(f"{u.id}\t{u.email}\t{u.name}\t{state}")
    except ServiceError as exc:
        print(f"Error: {exc.detail}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
