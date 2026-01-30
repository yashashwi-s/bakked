import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET_NAME = "whatsapp-media"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Credentials not found")
    exit(1)

try:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # List buckets
    buckets = client.storage.list_buckets()
    print(f"Current buckets: {[b.name for b in buckets]}")
    
    # Check if exists
    if any(b.name == BUCKET_NAME for b in buckets):
        print(f"✅ Bucket '{BUCKET_NAME}' already exists")
    else:
        print(f"Creating bucket '{BUCKET_NAME}'...")
        client.storage.create_bucket(BUCKET_NAME, options={"public": True})
        print(f"✅ Bucket '{BUCKET_NAME}' created successfully")

except Exception as e:
    print(f"❌ Error: {e}")
