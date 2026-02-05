import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def get_supabase_client() -> Optional[Client]:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("⚠️ Supabase credentials not configured - running without database")
        return None
    if "your_" in SUPABASE_URL or "your_" in SUPABASE_SERVICE_KEY:
        print("⚠️ Supabase credentials still have placeholder values - running without database")
        return None
    try:
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception as e:
        print(f"⚠️ Supabase connection failed: {e} - running without database")
        return None


class SupabaseDB:
    """Wrapper for Supabase database operations"""
    
    def __init__(self):
        self.client = get_supabase_client()
    
    # ---------- Contacts ----------
    def get_contacts(self, limit: int = 100, page: int = 1, search: str = None) -> Dict[str, Any]:
        """Fetch paginated contacts"""
        if not self.client:
            return {"contacts": [], "count": 0}
        
        offset = (page - 1) * limit
        
        try:
            # Build query
            query = self.client.table("contacts").select("*", count="exact")
            
            if search:
                # Search in name OR phone
                query = query.or_(f"name.ilike.%{search}%,phone.ilike.%{search}%")
            
            # Get total count (with filters applied)
            count_res = query.limit(0).execute()
            total = count_res.count if hasattr(count_res, 'count') else 0
            
            # Get data
            response = query\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            return {
                "contacts": response.data or [],
                "count": total
            }
        except Exception as e:
            print(f"Error fetching contacts: {e}")
            return {"contacts": [], "count": 0}
    
    def get_contacts_all(self) -> List[Dict[str, Any]]:
        """Fetch ALL contacts for internal filtering"""
        if not self.client:
            return []
        # TODO: Implement pagination if > 1000
        response = self.client.table("contacts").select("*").limit(5000).execute()
        return response.data or []
    
    def get_contact_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Get contact by phone number"""
        if not self.client:
            return None
        response = self.client.table("contacts").select("*").eq("phone", phone).single().execute()
        return response.data
    
    def upsert_contact(self, phone: str, name: Optional[str] = None, tags: List[str] = [], 
                      dob: Optional[str] = None, anniversary: Optional[str] = None, 
                      last_visit: Optional[str] = None) -> Dict[str, Any]:
        """Create or update a contact"""
        if not self.client:
            return {}
        data = {"phone": phone}
        if name:
            data["name"] = name
        if tags:
            data["tags"] = tags
        if dob:
            data["dob"] = dob
        if anniversary:
            data["anniversary"] = anniversary
        if last_visit:
            data["last_visit"] = last_visit
        response = self.client.table("contacts").upsert(data, on_conflict="phone").execute()
        return response.data[0] if response.data else {}
    
    def delete_contact(self, contact_id: str) -> bool:
        """Delete a contact"""
        if not self.client:
            return False
        response = self.client.table("contacts").delete().eq("id", contact_id).execute()
        return len(response.data) > 0 if response.data else False
    
    # ---------- Campaigns ----------
    def create_campaign(self, name: str, template_used: str, total_recipients: int = 0) -> Dict[str, Any]:
        """Create a new campaign"""
        if not self.client:
            return {}
        data = {
            "name": name,
            "template_used": template_used,
            "total_recipients": total_recipients
        }
        response = self.client.table("campaigns").insert(data).execute()
        return response.data[0] if response.data else {}
    
    def get_campaigns(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all campaigns"""
        if not self.client:
            return []
        response = self.client.table("campaigns").select("*").order("sent_at", desc=True).limit(limit).execute()
        return response.data or []
    
    # ---------- Message Logs ----------
    def create_message_log(self, contact_id: str, wa_id: str, campaign_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a message log entry"""
        if not self.client:
            return {}
        data = {
            "contact_id": contact_id,
            "wa_id": wa_id,
            "status": "sent"
        }
        if campaign_id:
            data["campaign_id"] = campaign_id
        response = self.client.table("message_logs").insert(data).execute()
        return response.data[0] if response.data else {}
    
    def update_message_status(self, wa_id: str, status: str) -> bool:
        """Update message status by WhatsApp message ID"""
        if not self.client:
            return False
        response = self.client.table("message_logs").update({
            "status": status,
            "updated_at": "now()"
        }).eq("wa_id", wa_id).execute()
        return len(response.data) > 0 if response.data else False
    
    def get_message_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent message logs with contact info"""
        if not self.client:
            return []
        response = self.client.table("message_logs").select(
            "*, contacts(phone, name)"
        ).order("sent_at", desc=True).limit(limit).execute()
        return response.data or []
    
    # ---------- Media ----------
    def save_media_record(self, storage_url: str, meta_id: Optional[str] = None) -> Dict[str, Any]:
        """Save media record to database"""
        if not self.client:
            return {}
        data = {"storage_url": storage_url}
        if meta_id:
            data["meta_id"] = meta_id
        response = self.client.table("media").insert(data).execute()
        return response.data[0] if response.data else {}

    # ---------- Templates (Local) ----------
    def create_local_template(self, name: str, message_text: str, category: str, 
                            media_urls: List[str] = [], buttons: List[Dict[str, Any]] = [],
                            card_body_text: str = None) -> Dict[str, Any]:
        """Create a local message template"""
        if not self.client:
            return {}
        data = {
            "name": name,
            "message_text": message_text,
            "category": category,
            "media_urls": media_urls,
        }
        # Try with buttons first, fall back without if column doesn't exist
        if buttons:
            data["buttons"] = buttons
        
        # Add card_body_text for carousel templates
        if card_body_text:
            data["card_body_text"] = card_body_text
        
        try:
            response = self.client.table("message_templates").insert(data).execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            # If buttons column doesn't exist, try without it
            if "buttons" in str(e) and "buttons" in data:
                del data["buttons"]
                response = self.client.table("message_templates").insert(data).execute()
                return response.data[0] if response.data else {}
            raise e

    def delete_local_template(self, template_id: str) -> bool:
        """Delete a local template"""
        if not self.client:
            return False
        response = self.client.table("message_templates").delete().eq("id", template_id).execute()
        return len(response.data) > 0 if response.data else False

    def get_local_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get local templates"""
        if not self.client:
            return []
        query = self.client.table("message_templates").select("*").eq("is_active", True)
        if category:
            query = query.eq("category", category)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    
    # ---------- Contact Last Message Tracking ----------
    def update_contact_last_message(self, contact_id: str, group_name: str) -> bool:
        """Update contact's last message timestamp and group"""
        if not self.client:
            return False
        try:
            self.client.table("contacts").update({
                "last_message_at": "now()",
                "last_message_group": group_name
            }).eq("id", contact_id).execute()
            return True
        except:
            return False

    def delete_local_template(self, template_id: str) -> bool:
        """Delete a local template"""
        if not self.client:
            return False
        response = self.client.table("message_templates").delete().eq("id", template_id).execute()
        return len(response.data) > 0 if response.data else False

    def get_local_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get local templates with Meta status"""
        if not self.client:
            return []
        query = self.client.table("message_templates").select("*").eq("is_active", True)
        if category:
            query = query.eq("category", category)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    
    def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a single template by ID"""
        if not self.client:
            return None
        try:
            response = self.client.table("message_templates").select("*").eq("id", template_id).single().execute()
            return response.data
        except:
            return None
    
    def update_template_meta_status(self, template_id: str, meta_template_id: str, 
                                    meta_name: str, meta_status: str) -> bool:
        """Update template with Meta API info after submission"""
        if not self.client:
            return False
        try:
            self.client.table("message_templates").update({
                "meta_template_id": meta_template_id,
                "meta_name": meta_name,
                "meta_status": meta_status
            }).eq("id", template_id).execute()
            return True
        except Exception as e:
            print(f"Error updating template meta status: {e}")
            return False
    
    def update_template_status_by_meta_name(self, meta_name: str, meta_status: str, 
                                            quality_score: Optional[str] = None) -> bool:
        """Update template status by Meta template name (for sync)"""
        if not self.client:
            return False
        try:
            update_data = {"meta_status": meta_status}
            if quality_score:
                update_data["quality_score"] = quality_score
            
            response = self.client.table("message_templates").update(update_data).eq("meta_name", meta_name).execute()
            return len(response.data) > 0 if response.data else False
        except Exception as e:
            print(f"Error updating template by meta_name: {e}")
            return False


class SupabaseStorage:
    """Wrapper for Supabase storage operations"""
    
    BUCKET_NAME = "whatsapp-media"
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def upload_file(self, file_data: bytes, filename: str, content_type: str) -> Optional[str]:
        """Upload file to Supabase storage and return public URL"""
        if not self.client:
            return None
        
        # Generate unique filename
        import uuid
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = f"uploads/{unique_filename}"
        
        try:
            # Upload to storage
            self.client.storage.from_(self.BUCKET_NAME).upload(
                file_path,
                file_data,
                {"content-type": content_type}
            )
            
            # Get public URL
            public_url = self.client.storage.from_(self.BUCKET_NAME).get_public_url(file_path)
            return public_url
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return None
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from storage"""
        if not self.client:
            return False
        try:
            self.client.storage.from_(self.BUCKET_NAME).remove([file_path])
            return True
        except Exception as e:
            print(f"❌ Delete error: {e}")
            return False


# Singleton instances
db = SupabaseDB()
storage = SupabaseStorage()
