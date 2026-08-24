from app.services.speech._shared import (
    DEFAULT_STT_PROVIDER,
    DEFAULT_TTS_PROVIDER,
    GOOGLE_TTS_VOICES,
    GROQ_STT_MODELS,
    SPEECH_SETTINGS_DOC,
    SpeechServiceError,
    load_speech_preference,
    openrouter_tts_available,
    resolve_speech_preference,
    resolve_stt_engine,
    resolve_tts_engine,
    stt_catalog,
    tts_catalog,
    validate_speech_preference,
)
from app.services.speech.google_tts import synthesize_speech
from app.services.speech.groq import transcribe_audio
from app.services.speech.openrouter_tts import (
    stream_speech_openrouter,
    synthesize_speech_openrouter,
)

__all__ = [
    "DEFAULT_STT_PROVIDER",
    "DEFAULT_TTS_PROVIDER",
    "GOOGLE_TTS_VOICES",
    "GROQ_STT_MODELS",
    "SPEECH_SETTINGS_DOC",
    "SpeechServiceError",
    "load_speech_preference",
    "openrouter_tts_available",
    "resolve_speech_preference",
    "resolve_stt_engine",
    "resolve_tts_engine",
    "stt_catalog",
    "stream_speech_openrouter",
    "synthesize_speech",
    "synthesize_speech_openrouter",
    "transcribe_audio",
    "tts_catalog",
    "validate_speech_preference",
]