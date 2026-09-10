"""Call record model (WebRTC in-app + Twilio PSTN)."""

from sqlalchemy import Column, DateTime, Integer, JSON, String

from app.db.session import Base
from app.models._shared import generate_uuid, utc_now


class Call(Base):
    __tablename__ = "calls"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    caller_id = Column(String(64), index=True, nullable=False)
    receiver_id = Column(String(64), index=True, nullable=False)
    status = Column(String(64), default="initiated", nullable=False)  # initiated, ringing, accepted, declined, ended
    call_type = Column(String(32), default="voice", nullable=False)    # voice, video
    provider = Column(String(32), default="in_app", nullable=False)    # in_app, twilio
    external_sid = Column(String(64), nullable=True, index=True)       # Twilio SID when provider=twilio
    phone_number = Column(String(32), nullable=True)                    # PSTN E.164 when provider=twilio
    duration = Column(Integer, default=0, nullable=False)
    messages = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
