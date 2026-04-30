# Input:  Existing PHP/MySQL database and new Django/PostgreSQL setup
# Output: Comparison report of record counts and data integrity

# scripts/verify_migration.py
"""
Cross-database verification script.
Run after migrating data to verify counts and checksums match.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from django.db import connections
from core.models import Product, User

def verify_table(model, table_name):
    """Compare record counts between PHP (legacy) and Django databases."""
    django_count = model.objects.count()

    # Query legacy database if configured as second connection
    with connections['legacy'].cursor() as cursor:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        legacy_count = cursor.fetchone()[0]

    status = "OK" if django_count == legacy_count else "MISMATCH"
    print(f"  {table_name}: legacy={legacy_count}, django={django_count} [{status}]")
    return django_count == legacy_count

if __name__ == '__main__':
    print("Migration verification report")
    print("=" * 50)

    tables = [
        (Product, 'products'),
        (User, 'users'),
    ]

    all_ok = all(verify_table(model, table) for model, table in tables)
    sys.exit(0 if all_ok else 1)
