"""
api.py — FastAPI bridge between the React frontend and the Python recommender.

Run with:
  uvicorn backend.api:app --reload --port 8000

Requirements (add to requirements.txt):
  fastapi>=0.110.0
  uvicorn>=0.29.0
"""

import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback

from backend.mood_music_recommender import recommend, list_moods, LOOKUP_TABLE

app = FastAPI(title="Mood Music API", version="1.0.0")


# ─────────────────────────────────────────────────────────────────────────────
# CORS
# Allows the React dev server (localhost:5173) to call this API.
# In production, replace the origin with your actual domain.
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS
# Pydantic models define the exact shape of JSON returned to the frontend.
# ─────────────────────────────────────────────────────────────────────────────

class Track(BaseModel):
    rank:         int
    title:        str
    artist:       str
    score:        float
    valence:      float
    energy:       float
    tempo:        int
    acousticness: float
    danceability: float
    spotify_url:  str


class RecommendResponse(BaseModel):
    mood:   str
    zone:   str
    tracks: list[Track]


class MoodInfo(BaseModel):
    mood:         str
    zone:         str
    valence:      float
    energy:       float
    tempo:        int
    mode:         str
    acousticness: float
    danceability: float
    seed_genres:  str


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Health check — confirms the API is running."""
    return {"status": "ok", "moods_available": len(LOOKUP_TABLE)}


@app.get("/moods", response_model=list[MoodInfo])
def get_moods():
    """
    Return all 22 moods with their feature targets.
    Useful for the frontend to build its tile grid dynamically.
    """
    df = list_moods()
    return df.to_dict(orient="records")


@app.get("/recommend/{mood}", response_model=RecommendResponse)
def get_recommendations(
    mood: str,
    top_n: int = Query(default=10, ge=1, le=50),
    max_per_artist: int = Query(default=2, ge=1, le=10),
):
    """
    Return top-N recommended tracks for a given mood.

    Parameters
    ----------
    mood           : mood name, e.g. "nostalgic" (must match LOOKUP_TABLE key)
    top_n          : how many tracks to return (1–50, default 10)
    max_per_artist : diversity cap per artist (default 2)

    Example
    -------
    GET /recommend/nostalgic
    GET /recommend/joyful?top_n=5
    """
    if mood not in LOOKUP_TABLE:
        available = sorted(LOOKUP_TABLE.keys())
        raise HTTPException(
            status_code=404,
            detail=f"Unknown mood '{mood}'. Available: {available}",
        )

    try:
        df = recommend(mood, top_n=top_n, max_per_artist=max_per_artist)
    except Exception as e:
        
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"Spotify API error: {str(e)}. Check your credentials in .env",
        )

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail="Spotify returned no results for this mood. Try a different mood.",
        )

    profile = LOOKUP_TABLE[mood]

    return RecommendResponse(
        mood=mood,
        zone=profile.zone,
        tracks=df.to_dict(orient="records"),
    )
