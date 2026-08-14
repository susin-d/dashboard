# TTS / STT Provider Comparison

Comparing speech providers for a voice agent, standardized to **minutes of speech
per month** where possible.

> **Assumption (TTS):** ~1,000 characters ≈ 1 minute of spoken English.

| Provider           |    STT free/month |           TTS free/month | Standardized     |
| ------------------ | ----------------: | -----------------------: | ---------------- |
| **Google Cloud**   |        **60 min** | **4M chars ≈ 4,000 min** | ⭐⭐⭐⭐⭐            |
| **ElevenLabs**     |        **10 min** |   **10K chars ≈ 10 min** | ⭐⭐⭐              |
| **AWS Transcribe** |       **60 min*** |                        — | ⭐⭐⭐              |
| **AssemblyAI**     |   **$50 credits** |                        — | Depends on usage |
| **Groq Whisper**   | **~480 min/day*** |                        — | ⭐⭐⭐⭐⭐            |
| **Murf API**       |                 — | **100K chars ≈ 100 min** | ⭐⭐⭐⭐             |
| **Kokoro local**   |                 — |            **Unlimited** | ♾️               |
| **Whisper local**  |     **Unlimited** |                        — | ♾️               |
| **Piper local**    |                 — |            **Unlimited** | ♾️               |

## Simplified ranking

### STT — minutes/month

- 🥇 **Groq:** ~14,400 min/month*
- 🥈 **Google:** 60 min/month
- 🥈 **AWS:** 60 min/month*
- **ElevenLabs:** ~10 min/month
- **Whisper local:** ♾️

### TTS — minutes/month

- 🥇 **Kokoro:** ♾️
- 🥇 **Piper:** ♾️
- 🥈 **Google Standard:** ~4,000 min/month
- 🥉 **Murf:** ~100 min
- **ElevenLabs:** ~10 min

> **Important:** Groq's limit is a **rate limit, not a guaranteed monthly
> allowance**, and AWS's 60-minute offer is for the **first 12 months**. Don't
> treat those as guaranteed monthly quotas.

If the goal is a **voice agent with 100–500 users**, compare **free minutes ×
requests/day × concurrent users** instead — character quotas alone can be
misleading.