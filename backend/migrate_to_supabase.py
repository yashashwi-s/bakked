"""
Migration Script: bakked_crm.db → Supabase

Run this once to transfer all customers from SQLite to Supabase.
Usage: cd backend && python migrate_to_supabase.py
"""

import sqlite3
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Note: python-dotenv not installed, using environment variables directly")

from supabase import create_client

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# SQLite path
SQLITE_DB = "../bakked_crm.db"


def migrate():
    # Connect to SQLite
    if not os.path.exists(SQLITE_DB):
        print(f"❌ SQLite database not found: {SQLITE_DB}")
        return
    
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    
    # Connect to Supabase
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase credentials not configured")
        return
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return
    
    # Fetch all customers from SQLite
    cursor.execute("SELECT phone, name, dob, created_at FROM customers")
    customers = cursor.fetchall()
    print(f"📊 Found {len(customers)} customers in SQLite")
    
    # Prepare data for Supabase
    migrated = 0
    skipped = 0
    
    for row in customers:
        phone = row["phone"]
        name = row["name"]
        
        # Skip invalid entries
        if not phone or len(phone) < 10:
            skipped += 1
            continue
        
        data = {
            "phone": phone,
            "name": name if name else None,
            "tags": ["imported"]  # Tag to identify migrated contacts
        }
        
        try:
            # Upsert to avoid duplicates
            supabase.table("contacts").upsert(data, on_conflict="phone").execute()
            migrated += 1
            
            if migrated % 50 == 0:
                print(f"  ✓ Migrated {migrated} contacts...")
                
        except Exception as e:
            print(f"  ⚠️ Failed to migrate {phone}: {e}")
            skipped += 1
    
    sqlite_conn.close()
    
    print(f"\n✅ Migration complete!")
    print(f"   Migrated: {migrated}")
    print(f"   Skipped: {skipped}")


if __name__ == "__main__":
    migrate()
