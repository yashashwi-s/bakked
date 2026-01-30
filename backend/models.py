from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class MessagePayload(BaseModel):
    """Request model for sending WhatsApp messages"""
    recipient: str = Field(..., description="Phone number in E.164 format (e.g., +919999999999)")
    text_content: Optional[str] = Field(None, description="Message text content (fills {{1}} in template)")
    media_urls: List[str] = Field(default_factory=list, description="List of media URLs")
    cta_link: Optional[str] = Field(None, description="Call-to-action link URL")
    template_name: Optional[str] = Field(None, description="Override default template name")
    button_text: Optional[str] = Field(None, description="CTA button text (if template supports {{1}} in button)")


class MessageResponse(BaseModel):
    """Response model from WhatsApp API"""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class Contact(BaseModel):
    """Contact model for CRM"""
    id: Optional[str] = None
    phone: str
    name: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class MediaUpload(BaseModel):
    """Response model for media upload"""
    storage_url: str
    filename: str


class Campaign(BaseModel):
    """Campaign model for batch messages"""
    id: Optional[str] = None
    name: str
    template_used: str
    sent_at: Optional[datetime] = None
    total_recipients: int = 0


class MessageLog(BaseModel):
    """Message log for status tracking"""
    id: Optional[str] = None
    contact_id: Optional[str] = None
    campaign_id: Optional[str] = None
    wa_id: Optional[str] = None
    status: str = "sent"  # sent, delivered, read
    sent_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WebhookVerification(BaseModel):
    """Query params for webhook verification"""
    hub_mode: str = Field(..., alias="hub.mode")
    hub_verify_token: str = Field(..., alias="hub.verify_token")
    hub_challenge: str = Field(..., alias="hub.challenge")
