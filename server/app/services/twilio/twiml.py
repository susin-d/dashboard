"""TwiML builders — Eve AI voice and human handoff."""

import html


def _escape(text: str) -> str:
    return html.escape(text or "")


def build_eve_twiml(message: str, voice: str = "alice", language: str = "en-US", gather: bool = True) -> str:
    """Eve answers via <Say> then <Gather> for barge-in (speech input).

    Gather posts to /gather-fast (fast model path, targets <1s reply)."""
    safe = _escape(message[:1600] or "Hello, this is Eve from StarWaves. How can I help you today?")
    if gather:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">{safe}</Say>
    <Gather input="speech" speechTimeout="auto" language="{language}" action="/api/v1/calls/twilio/gather-fast" method="POST">
        <Say voice="{voice}" language="{language}">You can speak after the tone.</Say>
    </Gather>
    <Say voice="{voice}" language="{language}">I didn't catch that. Goodbye.</Say>
    <Hangup/>
</Response>"""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">{safe}</Say>
    <Pause length="1"/>
    <Hangup/>
</Response>"""


def build_human_twiml(say_text: str | None = None, dial_number: str | None = None) -> str:
    """Human-to-human PSTN: optionally Say then Dial with status callback."""
    parts = ['<?xml version="1.0" encoding="UTF-8"?>\n<Response>']
    if say_text:
        parts.append(f'    <Say voice="alice">{_escape(say_text)}</Say>')
    if dial_number:
        parts.append(f'    <Dial callerId="true" answerOnBridge="true">{_escape(dial_number)}</Dial>')
    else:
        parts.append('    <Pause length="1"/>')
        parts.append('    <Hangup/>')
    parts.append('</Response>')
    return "\n".join(parts)


def build_echo_twiml(text: str) -> str:
    safe = _escape(text[:500])
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">You said: {safe}</Say>
    <Hangup/>
</Response>"""
