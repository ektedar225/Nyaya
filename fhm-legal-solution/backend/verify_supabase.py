import urllib.request
import json
import ssl
import sys

# Load settings from .env file
env_vars = {}
try:
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip()
except Exception as e:
    print("❌ Error reading .env file. Please run the script inside backend/ folder.")
    print("Details:", e)
    sys.exit(1)

supabase_url = env_vars.get("SUPABASE_URL")
service_role = env_vars.get("SUPABASE_SERVICE_ROLE_KEY")
bucket_name = env_vars.get("SUPABASE_STORAGE_BUCKET", "advocate-images")

if not supabase_url or not service_role:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.")
    sys.exit(1)

print("⚡ Starting Supabase Project Verification...")
print(f"URL: {supabase_url}")
print(f"Bucket: {bucket_name}")
print("-" * 50)

context = ssl._create_unverified_context()

def check_table(table_name):
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/{table_name}?select=*",
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}",
            "Range": "0-0"  # just check structure / count, don't fetch everything
        }
    )
    try:
        with urllib.request.urlopen(req, context=context) as response:
            print(f"✅ Table '{table_name}' exists and is accessible.")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e else ""
        print(f"❌ Table '{table_name}' check failed. Status Code: {e.code}")
        print("Details:", body)
        return False
    except Exception as e:
        print(f"❌ Table '{table_name}' connection failed. Error:", str(e))
        return False

def check_storage_bucket():
    req = urllib.request.Request(
        f"{supabase_url}/storage/v1/bucket/{bucket_name}",
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}"
        }
    )
    try:
        with urllib.request.urlopen(req, context=context) as response:
            data = json.loads(response.read().decode('utf-8'))
            is_public = data.get("public", False)
            if is_public:
                print(f"✅ Storage bucket '{bucket_name}' exists and is PUBLIC.")
            else:
                print(f"⚠️  Storage bucket '{bucket_name}' exists but is PRIVATE. Change to PUBLIC in Supabase settings so images can load.")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e else ""
        if e.code == 404:
            print(f"❌ Storage bucket '{bucket_name}' does not exist. Please create a public bucket named '{bucket_name}'.")
        else:
            print(f"❌ Storage bucket check failed. Status Code: {e.code}")
            print("Details:", body)
        return False
    except Exception as e:
        print("❌ Storage bucket check failed. Error:", str(e))
        return False

# Run checks
print("\n--- Checking Database Tables ---")
tables = ["admin_users", "advocates", "homepage_content", "practice_areas", "testimonials", "consultations"]
all_tables_ok = True
for table in tables:
    if not check_table(table):
        all_tables_ok = False

print("\n--- Checking Storage Bucket ---")
storage_ok = check_storage_bucket()

print("\n" + "="*50)
if all_tables_ok and storage_ok:
    print("🎉 ALL CHECKS PASSED! Your Supabase database and storage are fully ready.")
else:
    print("❌ SOME CHECKS FAILED. Please review the errors above and ensure you have run the schema.sql in Supabase SQL editor.")
print("="*50)
