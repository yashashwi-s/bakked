import os
import hashlib
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from typing import List, Optional
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

from models import MessagePayload, MessageResponse, Contact, MediaUpload
from supabase_client import db, storage
import random
from datetime import datetime

load_dotenv()

# Get password from env
APP_PASSWORD = os.getenv("PASS", "")

app = FastAPI(
    title="Bakked WhatsApp Marketing API",
    description="Decision Engine for WhatsApp Marketing Platform",
    version="1.0.0"
)

# CORS for frontend - allows localhost and deployed Vercel domains
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
CORS_ORIGINS.extend([
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== CONFIG ====================
META_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
WABA_ID = os.getenv("WHATSAPP_WABA_ID")  # WhatsApp Business Account ID for templates
API_VERSION = os.getenv("WHATSAPP_VERSION", "v22.0")
WEBHOOK_VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "bakked_verify_token")
BASE_URL = f"https://graph.facebook.com/{API_VERSION}/{PHONE_ID}/messages"
TEMPLATE_URL = f"https://graph.facebook.com/{API_VERSION}/{WABA_ID}/message_templates"


# ==================== HEALTH ====================
@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Bakked WhatsApp Marketing API",
        "version": "1.0.0"
    }


# ==================== AUTH ====================
class AuthRequest(BaseModel):
    password: str

@app.post("/auth/verify")
async def verify_auth(payload: AuthRequest):
    """Verify password for CRM access"""
    if not APP_PASSWORD:
        raise HTTPException(status_code=500, detail="Password not configured")
    
    # Compare passwords directly
    if payload.password == APP_PASSWORD:
        return {"valid": True}
    return {"valid": False}


# ==================== DECISION ENGINE ====================
@app.post("/send-message", response_model=MessageResponse)
async def process_and_send(payload: MessagePayload):
    """
    The Decision Engine: Maps raw intent to Meta Schema.
    
    Logic:
    - 2+ images → Carousel template
    - 1 image → Image CTA template  
    - 0 images → Plain text template
    
    All templates should have body with {{1}} placeholder for custom text.
    """
    if not META_TOKEN or not PHONE_ID:
        raise HTTPException(status_code=500, detail="WhatsApp API credentials not configured")
    
    headers = {
        "Authorization": f"Bearer {META_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Build components based on media count
    components = []
    
    # Body text component (for custom message text)
    if payload.text_content:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": payload.text_content}]
        })
    
    # Decision Logic: Route based on media count
    if len(payload.media_urls) > 1:
        # CAROUSEL: Multiple images
        template_name = payload.template_name or "bakked_carousel_v1"
        components.append({
            "type": "carousel",
            "cards": [
                {
                    "card_index": i,
                    "components": [{
                        "type": "header",
                        "parameters": [{"type": "image", "image": {"link": url}}]
                    }]
                } for i, url in enumerate(payload.media_urls[:10])  # Meta limit: 10 cards
            ]
        })
    
    elif len(payload.media_urls) == 1:
        # IMAGE CTA: Single image
        template_name = payload.template_name or "bakked_image_cta_v1"
        components.insert(0, {
            "type": "header",
            "parameters": [{"type": "image", "image": {"link": payload.media_urls[0]}}]
        })
        
    else:
        # PLAIN TEXT: No images
        template_name = payload.template_name or "bakked_text_v1"

    # Build final Meta API payload
    final_payload = {
        "messaging_product": "whatsapp",
        "to": payload.recipient.replace("+", ""),  # Meta expects without +
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": "en_US"},
            "components": components
        }
    }

    try:
        res = requests.post(BASE_URL, headers=headers, json=final_payload, timeout=30)
        res_data = res.json()
        
        if res.status_code == 200 and "messages" in res_data:
            wa_id = res_data["messages"][0]["id"]
            
            # Try to save to database (optional - won't crash if tables don't exist)
            try:
                contact = db.upsert_contact(phone=payload.recipient)
                if contact and contact.get("id"):
                    db.create_message_log(contact_id=contact["id"], wa_id=wa_id)
            except Exception as db_error:
                print(f"⚠️ Database save skipped: {db_error}")
            
            return MessageResponse(success=True, message_id=wa_id)
        else:
            error_msg = res_data.get("error", {}).get("message", "Unknown error")
            return MessageResponse(success=False, error=error_msg)
            
    except requests.exceptions.RequestException as e:
        return MessageResponse(success=False, error=str(e))


# ==================== MEDIA UPLOAD ====================
@app.post("/upload-media", response_model=MediaUpload)
async def upload_media(file: UploadFile = File(...)):
    """
    Upload media to Supabase Storage.
    Returns the public URL for use in WhatsApp messages.
    """
    if not file.content_type or not file.content_type.startswith(("image/", "video/")):
        raise HTTPException(status_code=400, detail="Only image and video files are allowed")
    
    # Read file content
    file_content = await file.read()
    
    # Upload to Supabase
    public_url = storage.upload_file(
        file_data=file_content,
        filename=file.filename or "upload",
        content_type=file.content_type
    )
    
    if not public_url:
        raise HTTPException(status_code=500, detail="Failed to upload file")
    
    # Save record to database
    db.save_media_record(storage_url=public_url)
    
    return MediaUpload(storage_url=public_url, filename=file.filename or "upload")


# ==================== WEBHOOK ====================
@app.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
    hub_challenge: str = Query(..., alias="hub.challenge")
):
    """
    Meta Webhook Verification.
    Meta sends GET request to verify your endpoint.
    """
    if hub_mode == "subscribe" and hub_verify_token == WEBHOOK_VERIFY_TOKEN:
        print(f"✅ Webhook verified successfully")
        return PlainTextResponse(content=hub_challenge)
    else:
        raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook")
async def receive_webhook(request: Request):
    """
    Meta Webhook Handler.
    Receives status updates: sent, delivered, read.
    """
    try:
        body = await request.json()
        
        # Extract status updates from webhook payload
        if "entry" in body:
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    # Handle status updates
                    for status in value.get("statuses", []):
                        wa_id = status.get("id")
                        new_status = status.get("status")  # sent, delivered, read
                        
                        if wa_id and new_status:
                            db.update_message_status(wa_id=wa_id, status=new_status)
                            print(f"📨 Status update: {wa_id} → {new_status}")
        
        return {"status": "ok"}
    
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {"status": "error", "message": str(e)}


# ==================== CONTACTS API ====================
@app.get("/contacts")
async def get_contacts(limit: int = 100):
    """Get all contacts from CRM"""
    contacts = db.get_contacts(limit=limit)
    return {"contacts": contacts, "count": len(contacts)}


@app.post("/contacts")
async def create_contact(contact: Contact):
    """Create or update a contact"""
    result = db.upsert_contact(
        phone=contact.phone,
        name=contact.name,
        tags=contact.tags,
        dob=getattr(contact, 'dob', None),
        anniversary=getattr(contact, 'anniversary', None),
        last_visit=getattr(contact, 'last_visit', None)
    )
    return result


class UpdateContactRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    anniversary: Optional[str] = None
    last_visit: Optional[str] = None
    is_active: Optional[bool] = None

@app.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, data: UpdateContactRequest):
    """Update a contact's details"""
    if not db.client:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.dob is not None:
        update_data["dob"] = data.dob if data.dob else None
    if data.anniversary is not None:
        update_data["anniversary"] = data.anniversary if data.anniversary else None
    if data.last_visit is not None:
        update_data["last_visit"] = data.last_visit if data.last_visit else None
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    try:
        response = db.client.table("contacts").update(update_data).eq("id", contact_id).execute()
        if response.data:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Contact not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CAMPAIGNS API ====================
@app.get("/campaigns")
async def get_campaigns(limit: int = 50):
    """Get all campaigns"""
    campaigns = db.get_campaigns(limit=limit)
    return {"campaigns": campaigns, "count": len(campaigns)}


# ==================== MESSAGE LOGS API ====================
@app.get("/message-logs")
async def get_message_logs(limit: int = 100):
    """Get recent message logs with status"""
    logs = db.get_message_logs(limit=limit)
    return {"logs": logs, "count": len(logs)}


# ==================== TEMPLATE MANAGER API ====================
from pydantic import BaseModel
from typing import Optional, List

class TemplateComponent(BaseModel):
    type: str  # HEADER, BODY, FOOTER, BUTTONS
    format: Optional[str] = None  # TEXT, IMAGE, VIDEO, DOCUMENT (for HEADER)
    text: Optional[str] = None
    buttons: Optional[List[dict]] = None

class CreateTemplateRequest(BaseModel):
    name: str
    category: str = "MARKETING"  # MARKETING, UTILITY, AUTHENTICATION
    language: str = "en_US"
    components: List[TemplateComponent]

@app.post("/templates")
async def create_template(template: CreateTemplateRequest):
    """
    Create a new WhatsApp message template via Meta API.
    Template will be submitted for approval.
    """
    if not WABA_ID:
        raise HTTPException(status_code=500, detail="WHATSAPP_WABA_ID not configured")
    
    headers = {
        "Authorization": f"Bearer {META_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Build template payload for Meta API
    components = []
    for comp in template.components:
        component = {"type": comp.type}
        if comp.format:
            component["format"] = comp.format
        if comp.text:
            component["text"] = comp.text
        if comp.buttons:
            component["buttons"] = comp.buttons
        components.append(component)
    
    payload = {
        "name": template.name,
        "category": template.category,
        "language": template.language,
        "components": components
    }
    
    try:
        res = requests.post(TEMPLATE_URL, headers=headers, json=payload, timeout=30)
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/templates")
async def list_templates():
    """List all message templates with their status"""
    if not WABA_ID:
        raise HTTPException(status_code=500, detail="WHATSAPP_WABA_ID not configured")
    
    headers = {"Authorization": f"Bearer {META_TOKEN}"}
    
    try:
        res = requests.get(TEMPLATE_URL, headers=headers, timeout=30)
        data = res.json()
        
        templates = []
        for t in data.get("data", []):
            templates.append({
                "name": t.get("name"),
                "status": t.get("status"),
                "category": t.get("category"),
                "language": t.get("language"),
                "id": t.get("id"),
                "components": t.get("components", [])
            })
        
        return {"templates": templates, "count": len(templates)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/templates/{template_name}")
async def get_template_status(template_name: str):
    """Get status of a specific template"""
    if not WABA_ID:
        raise HTTPException(status_code=500, detail="WHATSAPP_WABA_ID not configured")
    
    headers = {"Authorization": f"Bearer {META_TOKEN}"}
    url = f"{TEMPLATE_URL}?name={template_name}"
    
    try:
        res = requests.get(url, headers=headers, timeout=30)
        data = res.json()
        
        templates = data.get("data", [])
        if templates:
            t = templates[0]
            return {
                "name": t.get("name"),
                "status": t.get("status"),
                "category": t.get("category"),
                "components": t.get("components", [])
            }
        else:
            raise HTTPException(status_code=404, detail="Template not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/templates/{template_name}")
async def delete_template(template_name: str):
    """Delete a message template"""
    if not WABA_ID:
        raise HTTPException(status_code=500, detail="WHATSAPP_WABA_ID not configured")
    
    headers = {"Authorization": f"Bearer {META_TOKEN}"}
    url = f"{TEMPLATE_URL}?name={template_name}"
    
    try:
        res = requests.delete(url, headers=headers, timeout=30)
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BULK CAMPAIGN API ====================
from datetime import date, timedelta

class MediaConfig(BaseModel):
    fixed_urls: List[str] = []
    random_pool: List[str] = []
    random_count: int = 0

class BulkCTAButton(BaseModel):
    type: str  # 'url' or 'phone'
    text: str
    url: Optional[str] = None
    phone: Optional[str] = None

class BulkCampaignRequest(BaseModel):
    type: str  # birthday, anniversary, festival, nudge, custom
    message_text: str
    message_variations: List[str] = []  # List of message templates to randomize
    media_url: Optional[str] = None     # Legacy single media
    media_config: Optional[MediaConfig] = None # New randomization config
    buttons: List[BulkCTAButton] = []  # Multiple buttons (up to 2)
    specific_recipients: Optional[List[str]] = None # List of phone numbers (for testing/specific groups)
    nudge_days: Optional[int] = None # For nudge campaigns

class SaveGroupRequest(BaseModel):
    name: str
    type: str # static, dynamic
    criteria: Optional[dict] = None # { "type": "nudge", "days": 30 }
    member_ids: Optional[List[str]] = None

class TestMessageRequest(BaseModel):
    phone: str
    message: str
    media_urls: List[str] = []
    template_name: Optional[str] = None

def replace_placeholders(text: str, contact: dict) -> str:
    """Replace [Name], [Phone], [Days] with actual values"""
    result = text
    result = result.replace("[Name]", contact.get("name") or "Friend")
    result = result.replace("[Phone]", contact.get("phone") or "")
    
    # Calculate days since last visit
    last_visit = contact.get("last_visit")
    if last_visit:
        try:
            from datetime import datetime
            lv = datetime.fromisoformat(last_visit.replace("Z", "+00:00"))
            days = (datetime.now(lv.tzinfo) - lv).days
            result = result.replace("[Days]", str(days))
        except:
            result = result.replace("[Days]", "some")
    else:
        result = result.replace("[Days]", "")
    
    return result


@app.get("/groups/{group_type}/count")
async def get_group_recipient_count(group_type: str):
    """Get count of recipients for a campaign type"""
    today = date.today()
    
    try:
        if group_type == "birthday":
            # Contacts with DOB matching today (month and day)
            response = db.client.table("contacts").select("id", count="exact").execute()
            # For now return total count, filtering by DOB needs date functions
            return {"count": len(response.data) if response.data else 0, "type": group_type}
        
        elif group_type == "anniversary":
            response = db.client.table("contacts").select("id", count="exact").execute()
            return {"count": len(response.data) if response.data else 0, "type": group_type}
        
        elif group_type == "festival":
            # All contacts for festival messages
            response = db.client.table("contacts").select("id", count="exact").execute()
            return {"count": len(response.data) if response.data else 0, "type": group_type}
        
        elif group_type == "nudge":
            # Contacts inactive for 30+ days
            response = db.client.table("contacts").select("id", count="exact").execute()
            return {"count": len(response.data) if response.data else 0, "type": group_type}
        
        else:
            return {"count": 0, "type": group_type}
    except Exception as e:
        print(f"Error getting count: {e}")
        return {"count": 0, "type": group_type}


@app.get("/groups/{group_type}/members")
async def get_group_members(group_type: str, limit: int = 100, days: Optional[int] = Query(None)):
    """Get members of a campaign group"""
    try:
        if group_type == "birthday":
            # Filter in python for now
            all_contacts = db.get_contacts_all()
            today = date.today()
            members = []
            for c in all_contacts:
                if c.get("dob"):
                    try:
                        dob = datetime.strptime(c["dob"], "%Y-%m-%d").date()
                        if dob.month == today.month and dob.day == today.day:
                            members.append(c)
                    except:
                        pass
            return {"members": members, "count": len(members)}
            
        elif group_type == "anniversary":
            all_contacts = db.get_contacts_all()
            today = date.today()
            members = []
            for c in all_contacts:
                if c.get("anniversary"):
                    try:
                        anniv = datetime.strptime(c["anniversary"], "%Y-%m-%d").date()
                        if anniv.month == today.month and anniv.day == today.day:
                            members.append(c)
                    except:
                        pass
            return {"members": members, "count": len(members)}
        
        elif group_type == "nudge":
            if days is None:
                return {"members": [], "count": 0, "error": "Days parameter required for nudge"}
            
            all_contacts = db.get_contacts_all()
            members = []
            today = date.today()
            for c in all_contacts:
                if c.get("last_visit"):
                    try:
                        # Handle ISO format with potential Z or offset
                        lv_str = c["last_visit"].replace("Z", "+00:00")
                        lv = datetime.fromisoformat(lv_str).date()
                        delta = (today - lv).days
                        if delta == days:
                            members.append(c)
                    except:
                        pass
            return {"members": members, "count": len(members)}
            
        else:
            response = db.client.table("contacts").select("*").limit(limit).execute()
            return {"members": response.data or [], "count": len(response.data or [])}
    except Exception as e:
        return {"members": [], "count": 0, "error": str(e)}

@app.post("/recipient-groups")
async def save_recipient_group(group: SaveGroupRequest):
    """Save a group of recipients"""
    try:
        data = {
            "name": group.name,
            "type": group.type, # 'manual' or 'dynamic'
            "trigger_rule": group.criteria if group.criteria else {},
            "active": True
        }
        # Insert into groups table
        res = db.client.table("groups").insert(data).execute()
        group_id = res.data[0]["id"]
        
        # If static/manual, save members
        if group.type == "manual" and group.member_ids:
            # We need a group_members table or similar. 
            # The schema has 'group_members' in migration_v2 but 'groups' in schema.sql
            # Let's use 'group_members' from migration_v2 which links to 'recipient_groups'
            # Wait, schema.sql has 'groups' table. migration_v2 has 'recipient_groups'.
            # Let's use 'recipient_groups' table from migration_v2 as it seems more recent/relevant for this feature.
            # Actually, let's stick to 'groups' from schema.sql as it's the main one, but it lacks a many-to-many link table in schema.sql?
            # schema.sql has 'groups' but no member link. migration_v2 has 'recipient_groups' and 'group_members'.
            # Let's use 'recipient_groups' and 'group_members' from migration_v2.
            
            # Re-insert into recipient_groups instead of groups
            res = db.client.table("recipient_groups").insert({
                "name": group.name,
                "type": "manual"
            }).execute()
            group_id = res.data[0]["id"]
            
            member_rows = [{"group_id": group_id, "contact_id": cid} for cid in group.member_ids]
            if member_rows:
                db.client.table("group_members").insert(member_rows).execute()
                
        return {"success": True, "id": group_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recipient-groups")
async def list_recipient_groups(type: Optional[str] = None):
    """List saved recipient groups"""
    try:
        query = db.client.table("groups").select("*").eq("active", True)
        if type:
            query = query.eq("type", type)
        res = query.order("created_at", desc=True).execute()
        return {"groups": res.data or [], "count": len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-message")
async def send_test_message(payload: TestMessageRequest):
    """Send a single test message"""
    # Reuse process_and_send logic but simpler
    msg_payload = MessagePayload(
        recipient=payload.phone,
        text_content=payload.message,
        media_urls=payload.media_urls,
        template_name=payload.template_name
    )
    return await process_and_send(msg_payload)


@app.post("/campaigns/send")
async def send_bulk_campaign(payload: BulkCampaignRequest):
    """Send messages to all recipients in a group"""
    if not META_TOKEN or not PHONE_ID:
        raise HTTPException(status_code=500, detail="WhatsApp API not configured")
    
    headers = {
        "Authorization": f"Bearer {META_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Get recipients
    contacts = []
    try:
        if payload.specific_recipients:
            # Fetch specific contacts
            # This is inefficient for many contacts, but fine for small batches
            for phone in payload.specific_recipients:
                c = db.get_contact_by_phone(phone)
                if c:
                    contacts.append(c)
        elif payload.type == "birthday":
            # Re-use logic from get_group_members
            all_c = db.get_contacts_all()
            today = date.today()
            for c in all_c:
                if c.get("dob"):
                    try:
                        dob = datetime.strptime(c["dob"], "%Y-%m-%d").date()
                        if dob.month == today.month and dob.day == today.day:
                            contacts.append(c)
                    except: pass
        elif payload.type == "anniversary":
            all_c = db.get_contacts_all()
            today = date.today()
            for c in all_c:
                if c.get("anniversary"):
                    try:
                        anniv = datetime.strptime(c["anniversary"], "%Y-%m-%d").date()
                        if anniv.month == today.month and anniv.day == today.day:
                            contacts.append(c)
                    except: pass
        elif payload.type == "nudge":
            if payload.nudge_days is not None:
                all_c = db.get_contacts_all()
                today = date.today()
                for c in all_c:
                    if c.get("last_visit"):
                        try:
                            lv_str = c["last_visit"].replace("Z", "+00:00")
                            lv = datetime.fromisoformat(lv_str).date()
                            delta = (today - lv).days
                            if delta == payload.nudge_days:
                                contacts.append(c)
                        except: pass
        else:
            # Everyone
            response = db.client.table("contacts").select("*").execute()
            contacts = response.data or []
            
    except Exception as e:
        return {"success": False, "error": f"Database error: {e}", "sent_count": 0}
    
    if not contacts:
        return {"success": False, "error": "No recipients found", "sent_count": 0}
    
    # Create campaign record
    campaign_id = None
    try:
        campaign = db.client.table("campaigns").insert({
            "name": f"{payload.type.title()} Campaign - {date.today()}",
            "message_text": payload.message_text, # Base message
            "total_recipients": len(contacts)
        }).execute()
        if campaign.data:
            campaign_id = campaign.data[0]["id"]
    except Exception as e:
        print(f"Failed to create campaign: {e}")
    
    # Send to each recipient
    sent_count = 0
    failed_count = 0
    
    for contact in contacts:
        phone = contact.get("phone", "")
        if not phone:
            continue
        
        # 1. Select Message Variation
        base_message = payload.message_text
        if payload.message_variations:
            base_message = random.choice(payload.message_variations)
            
        # Replace placeholders
        message = replace_placeholders(base_message, contact)
        
        # 2. Select Media
        media_urls = []
        if payload.media_config:
            # Add fixed images
            media_urls.extend(payload.media_config.fixed_urls)
            # Add random images
            if payload.media_config.random_pool and payload.media_config.random_count > 0:
                # Sample without replacement if possible, else with replacement
                count = min(payload.media_config.random_count, len(payload.media_config.random_pool))
                media_urls.extend(random.sample(payload.media_config.random_pool, count))
        elif payload.media_url:
            media_urls.append(payload.media_url)
            
        # 3. Send via Decision Engine logic (re-using process_and_send logic manually or calling it?)
        # Calling process_and_send is cleaner but it expects a request object.
        # We'll construct the payload manually to avoid overhead/async issues in loop if not careful,
        # but actually calling the function is better for DRY.
        
        # Construct MessagePayload
        msg_payload = MessagePayload(
            recipient=phone,
            text_content=message,
            media_urls=media_urls,
            template_name=None # Let decision engine decide
        )
        
        # We can call the logic directly. 
        # Since process_and_send is an async route handler, we can call it.
        # However, it raises HTTPException on error, which we want to catch.
        
        try:
            # We'll duplicate the logic slightly to avoid the HTTPException handling mess 
            # or refactor process_and_send to a helper. 
            # For now, let's just use the logic inline or call a helper.
            # Let's use the logic inline for speed.
            
            # ... (Logic from process_and_send) ...
            
            # Components
            components = []
            if message:
                components.append({
                    "type": "body",
                    "parameters": [{"type": "text", "text": message}]
                })
            
            if len(media_urls) > 1:
                template_name = "bakked_carousel_v1"
                components.append({
                    "type": "carousel",
                    "cards": [
                        {
                            "card_index": i,
                            "components": [{
                                "type": "header",
                                "parameters": [{"type": "image", "image": {"link": url}}]
                            }]
                        } for i, url in enumerate(media_urls[:10])
                    ]
                })
            elif len(media_urls) == 1:
                template_name = "bakked_image_cta_v1"
                components.insert(0, {
                    "type": "header",
                    "parameters": [{"type": "image", "image": {"link": media_urls[0]}}]
                })
            else:
                template_name = "bakked_text_v1"

            final_payload = {
                "messaging_product": "whatsapp",
                "to": phone.replace("+", ""),
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "en_US"},
                    "components": components
                }
            }
            
            res = requests.post(BASE_URL, headers=headers, json=final_payload, timeout=30)
            res_data = res.json()
            
            if res.status_code == 200 and "messages" in res_data:
                wa_id = res_data["messages"][0]["id"]
                sent_count += 1
                # Log message
                try:
                    db.client.table("message_logs").insert({
                        "contact_id": contact["id"],
                        "campaign_id": campaign_id,
                        "wa_id": wa_id,
                        "status": "sent"
                    }).execute()
                    # Update contact's last message tracking
                    db.update_contact_last_message(contact["id"], payload.type)
                except: pass
            else:
                failed_count += 1
                print(f"Failed to send to {phone}: {res_data}")

        except Exception as e:
            failed_count += 1
            print(f"Failed to send to {phone}: {e}")
    
    # Update campaign stats
    if campaign_id:
        try:
            db.client.table("campaigns").update({
                "sent_count": sent_count
            }).eq("id", campaign_id).execute()
        except:
            pass
    
    return {
        "success": sent_count > 0,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total": len(contacts)
    }


# ==================== LOCAL TEMPLATES API ====================
class CTAButton(BaseModel):
    type: str  # 'url' or 'phone'
    text: str
    url: Optional[str] = None
    phone: Optional[str] = None

class LocalTemplateRequest(BaseModel):
    name: str
    message_text: str
    category: str
    media_urls: List[str] = []
    buttons: List[CTAButton] = []

@app.post("/local-templates")
async def create_local_template(template: LocalTemplateRequest):
    """Save a template locally"""
    try:
        # Convert buttons to dict list for JSON storage
        buttons_data = [btn.dict() for btn in template.buttons] if template.buttons else []
        
        result = db.create_local_template(
            name=template.name,
            message_text=template.message_text,
            category=template.category,
            media_urls=template.media_urls,
            buttons=buttons_data
        )
        return result
    except Exception as e:
        print(f"Error creating template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/local-templates/{template_id}")
async def delete_local_template(template_id: str):
    """Delete a local template"""
    success = db.delete_local_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}

@app.get("/local-templates")
async def get_local_templates(category: Optional[str] = None):
    """Get local templates"""
    templates = db.get_local_templates(category=category)
    return {"templates": templates, "count": len(templates)}


# ==================== RUN SERVER ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

