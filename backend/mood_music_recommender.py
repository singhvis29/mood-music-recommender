"""
Mood-based music recommender — full Python implementation.

Pipeline:
  1. User selects a mood
  2. Lookup table maps mood → target Spotify audio features
  3. Spotify Recommendations API returns 50 candidate tracks
  4. Weighted Euclidean distance scores each track
  5. Diversity filter applied, top-N returned

Requirements:
  pip install spotipy pandas numpy python-dotenv
"""

import os
import math
import numpy as np
import pandas as pd
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
from dataclasses import dataclass, field
from typing import Optional

load_dotenv()


# ─────────────────────────────────────────────────────────────────────────────
# 1. LOOKUP TABLE
#    Each entry defines target audio features for one mood.
#    Fields map 1-to-1 with Spotify's audio features API.
#    tempo_norm = tempo / 200  (normalised to [0,1] for distance math)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class MoodProfile:
    mood: str
    zone: str                       # positive | negative | calm | complex
    valence: float                  # 0–1  (pleasantness)
    energy: float                   # 0–1  (intensity/arousal)
    tempo: int                      # BPM
    mode: int                       # 1 = major, 0 = minor
    acousticness: float             # 0–1
    danceability: float             # 0–1
    instrumentalness: float         # 0–1
    speechiness: float              # 0–1
    seed_genres: list[str] = field(default_factory=list)

    @property
    def tempo_norm(self) -> float:
        return self.tempo / 200.0

    def to_feature_vector(self) -> np.ndarray:
        """Return the features used in distance scoring as a numpy array."""
        return np.array([
            self.valence,
            self.energy,
            self.tempo_norm,
            self.acousticness,
            self.danceability,
        ])


LOOKUP_TABLE: dict[str, MoodProfile] = {
    p.mood: p for p in [
        MoodProfile("joyful",      "positive", 0.92, 0.76, 124, 1, 0.12, 0.72, 0.05, 0.06, ["pop", "happy", "dance pop"]),
        MoodProfile("excited",     "positive", 0.84, 0.91, 138, 1, 0.06, 0.68, 0.04, 0.08, ["edm", "electro", "pop"]),
        MoodProfile("euphoric",    "positive", 0.88, 0.94, 142, 1, 0.04, 0.65, 0.10, 0.05, ["trance", "big-room", "progressive-house"]),
        MoodProfile("content",     "calm",     0.80, 0.36,  94, 1, 0.52, 0.58, 0.15, 0.04, ["indie-folk", "acoustic", "singer-songwriter"]),
        MoodProfile("serene",      "calm",     0.74, 0.22,  78, 1, 0.74, 0.42, 0.40, 0.03, ["ambient", "new-age", "classical"]),
        MoodProfile("hopeful",     "positive", 0.70, 0.54, 108, 1, 0.38, 0.60, 0.10, 0.05, ["indie-pop", "folk", "acoustic-pop"]),
        MoodProfile("romantic",    "calm",     0.72, 0.40,  88, 1, 0.48, 0.56, 0.12, 0.04, ["soul", "r-n-b", "jazz"]),
        MoodProfile("nostalgic",   "complex",  0.52, 0.32,  84, 0, 0.60, 0.48, 0.20, 0.04, ["indie", "lo-fi", "chillwave"]),
        MoodProfile("focused",     "complex",  0.54, 0.58, 112, 1, 0.22, 0.55, 0.50, 0.04, ["instrumental", "study", "electronic"]),
        MoodProfile("melancholy",  "negative", 0.28, 0.30,  76, 0, 0.65, 0.40, 0.15, 0.04, ["sad", "indie", "singer-songwriter"]),
        MoodProfile("sad",         "negative", 0.18, 0.22,  68, 0, 0.70, 0.34, 0.18, 0.04, ["sad", "emo", "acoustic"]),
        MoodProfile("grief",       "negative", 0.12, 0.18,  60, 0, 0.80, 0.28, 0.25, 0.03, ["classical", "sad", "piano"]),
        MoodProfile("anxious",     "negative", 0.28, 0.82, 136, 0, 0.10, 0.45, 0.05, 0.12, ["dark-techno", "industrial", "metal"]),
        MoodProfile("angry",       "negative", 0.14, 0.90, 148, 0, 0.05, 0.42, 0.04, 0.10, ["metal", "punk", "hardcore"]),
        MoodProfile("stressed",    "negative", 0.24, 0.72, 126, 0, 0.14, 0.48, 0.06, 0.10, ["dark-pop", "alternative", "post-punk"]),
        MoodProfile("tired",       "complex",  0.38, 0.14,  64, 0, 0.72, 0.36, 0.35, 0.03, ["sleep", "ambient", "lo-fi"]),
        MoodProfile("bored",       "negative", 0.36, 0.20,  82, 0, 0.50, 0.44, 0.20, 0.04, ["lo-fi", "chillhop", "minimal-techno"]),
        MoodProfile("lonely",      "negative", 0.20, 0.26,  72, 0, 0.68, 0.36, 0.18, 0.04, ["sad", "indie", "ambient"]),
        MoodProfile("empowered",   "positive", 0.78, 0.88, 132, 1, 0.08, 0.66, 0.05, 0.12, ["hip-hop", "power-pop", "rock"]),
        MoodProfile("playful",     "positive", 0.86, 0.70, 118, 1, 0.18, 0.78, 0.06, 0.06, ["funk", "pop", "indie-pop"]),
        MoodProfile("dreamy",      "complex",  0.62, 0.28,  80, 1, 0.55, 0.50, 0.30, 0.04, ["dream-pop", "shoegaze", "chillwave"]),
        MoodProfile("pensive",     "complex",  0.42, 0.34,  82, 0, 0.58, 0.42, 0.25, 0.04, ["indie", "post-rock", "classical"]),
    ]
}


# ─────────────────────────────────────────────────────────────────────────────
# 2. FEATURE WEIGHTS
#    How much each dimension contributes to the distance score.
#    Valence and energy are primary; the rest are refinements.
#    Must sum to 1.0.
# ─────────────────────────────────────────────────────────────────────────────

WEIGHTS = np.array([
    0.40,   # valence
    0.35,   # energy
    0.12,   # tempo (normalised)
    0.08,   # acousticness
    0.05,   # danceability
])

assert math.isclose(WEIGHTS.sum(), 1.0), "Weights must sum to 1.0"


# ─────────────────────────────────────────────────────────────────────────────
# 3. SPOTIFY CLIENT
# ─────────────────────────────────────────────────────────────────────────────

def get_spotify_client() -> spotipy.Spotify:
    """
    Initialise Spotipy using client credentials flow.
    Set SPOTIPY_CLIENT_ID and SPOTIPY_CLIENT_SECRET in your .env file.
    """
    return spotipy.Spotify(
        auth_manager=SpotifyClientCredentials(
            client_id=os.getenv("SPOTIPY_CLIENT_ID"),
            client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
        )
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4. SPOTIFY API QUERY
#    Fetch 50 candidate tracks using the recommendations endpoint.
#    We use target_* params (soft targets) rather than min_/max_
#    so Spotify has room to return varied results.
# ─────────────────────────────────────────────────────────────────────────────

def fetch_candidates(
    sp: spotipy.Spotify,
    profile: MoodProfile,
    limit: int = 50,
) -> list[dict]:
    """
    Call Spotify's /recommendations endpoint and return raw track objects.
    Uses up to 2 seed genres (API maximum per call with no seed tracks/artists).
    """
    results = sp.recommendations(
        seed_genres=profile.seed_genres[:2],
        target_valence=profile.valence,
        target_energy=profile.energy,
        target_tempo=profile.tempo,
        target_mode=profile.mode,
        target_acousticness=profile.acousticness,
        target_danceability=profile.danceability,
        limit=limit,
    )
    return results.get("tracks", [])


def get_audio_features(
    sp: spotipy.Spotify,
    track_ids: list[str],
) -> dict[str, dict]:
    """
    Fetch audio features for a batch of track IDs.
    Spotify's audio_features() accepts up to 100 IDs per call.
    Returns a dict keyed by track_id.
    """
    features = sp.audio_features(track_ids)
    return {f["id"]: f for f in features if f is not None}


# ─────────────────────────────────────────────────────────────────────────────
# 5. SCORING
#    Weighted Euclidean distance between a track's audio features
#    and the mood profile's target vector.
#    Lower score = better match.
# ─────────────────────────────────────────────────────────────────────────────

def score_track(
    audio_features: dict,
    profile: MoodProfile,
    weights: np.ndarray = WEIGHTS,
) -> float:
    """
    Compute weighted Euclidean distance between a track's features
    and the target mood profile.

    Returns a float in [0, 1] range (approximately).
    Lower = closer match to the target mood.
    """
    track_vector = np.array([
        audio_features.get("valence", 0.5),
        audio_features.get("energy", 0.5),
        audio_features.get("tempo", 120) / 200.0,
        audio_features.get("acousticness", 0.5),
        audio_features.get("danceability", 0.5),
    ])

    diff = track_vector - profile.to_feature_vector()
    return float(np.sqrt(np.dot(weights, diff ** 2)))


# ─────────────────────────────────────────────────────────────────────────────
# 6. DIVERSITY FILTER
#    After scoring, avoid returning many tracks by the same artist.
#    Simple greedy approach: max N tracks per artist in the final output.
# ─────────────────────────────────────────────────────────────────────────────

def apply_diversity_filter(
    ranked_tracks: list[dict],
    max_per_artist: int = 2,
) -> list[dict]:
    """
    Greedy diversity filter. Iterates ranked tracks in order (best first)
    and keeps a track only if its artist hasn't hit the cap yet.
    """
    artist_counts: dict[str, int] = {}
    filtered = []

    for track in ranked_tracks:
        artist_id = track["artists"][0]["id"]
        count = artist_counts.get(artist_id, 0)
        if count < max_per_artist:
            filtered.append(track)
            artist_counts[artist_id] = count + 1

    return filtered


# ─────────────────────────────────────────────────────────────────────────────
# 7. MAIN RECOMMENDATION FUNCTION
#    Ties everything together.
# ─────────────────────────────────────────────────────────────────────────────

def recommend(
    mood: str,
    top_n: int = 10,
    max_per_artist: int = 2,
    sp: Optional[spotipy.Spotify] = None,
) -> pd.DataFrame:
    """
    Given a mood string, return a ranked DataFrame of recommended tracks.

    Parameters
    ----------
    mood          : one of the keys in LOOKUP_TABLE (e.g. "joyful", "anxious")
    top_n         : number of tracks to return after filtering
    max_per_artist: max tracks per artist in final output (diversity)
    sp            : optional pre-initialised Spotipy client

    Returns
    -------
    pd.DataFrame with columns:
        rank, title, artist, score, valence, energy, tempo,
        acousticness, danceability, spotify_url
    """
    if mood not in LOOKUP_TABLE:
        available = sorted(LOOKUP_TABLE.keys())
        raise ValueError(f"Unknown mood '{mood}'. Available: {available}")

    profile = LOOKUP_TABLE[mood]
    if sp is None:
        sp = get_spotify_client()

    # Step 1 — fetch 50 candidates from Spotify
    candidates = fetch_candidates(sp, profile, limit=50)
    if not candidates:
        return pd.DataFrame()

    # Step 2 — batch-fetch audio features
    track_ids = [t["id"] for t in candidates]
    af_map = get_audio_features(sp, track_ids)

    # Step 3 — score each track
    scored = []
    for track in candidates:
        tid = track["id"]
        if tid not in af_map:
            continue
        af = af_map[tid]
        dist = score_track(af, profile)
        scored.append({
            "id":           tid,
            "title":        track["name"],
            "artist":       track["artists"][0]["name"],
            "artists":      track["artists"],           # kept for diversity filter
            "score":        round(dist, 4),
            "valence":      round(af.get("valence", 0), 3),
            "energy":       round(af.get("energy", 0), 3),
            "tempo":        round(af.get("tempo", 0)),
            "acousticness": round(af.get("acousticness", 0), 3),
            "danceability": round(af.get("danceability", 0), 3),
            "spotify_url":  track["external_urls"].get("spotify", ""),
        })

    # Step 4 — sort by score ascending (lower = better match)
    scored.sort(key=lambda x: x["score"])

    # Step 5 — diversity filter
    filtered = apply_diversity_filter(scored, max_per_artist=max_per_artist)

    # Step 6 — take top N and clean up
    top = filtered[:top_n]
    for i, t in enumerate(top):
        t["rank"] = i + 1
        t.pop("artists", None)
        t.pop("id", None)

    cols = ["rank", "title", "artist", "score", "valence",
            "energy", "tempo", "acousticness", "danceability", "spotify_url"]
    return pd.DataFrame(top, columns=cols)


# ─────────────────────────────────────────────────────────────────────────────
# 8. UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def list_moods() -> pd.DataFrame:
    """Return a DataFrame of all available moods and their feature targets."""
    rows = []
    for p in LOOKUP_TABLE.values():
        rows.append({
            "mood":           p.mood,
            "zone":           p.zone,
            "valence":        p.valence,
            "energy":         p.energy,
            "tempo":          p.tempo,
            "mode":           "major" if p.mode == 1 else "minor",
            "acousticness":   p.acousticness,
            "danceability":   p.danceability,
            "instrumentalness": p.instrumentalness,
            "seed_genres":    ", ".join(p.seed_genres),
        })
    return pd.DataFrame(rows).sort_values("zone").reset_index(drop=True)


def explain_score(mood: str, track_features: dict) -> pd.DataFrame:
    """
    Break down how each feature contributes to the total distance score
    for a given track. Useful for debugging and explainability.
    """
    profile = LOOKUP_TABLE[mood]
    feature_names = ["valence", "energy", "tempo_norm", "acousticness", "danceability"]
    track_vec = np.array([
        track_features.get("valence", 0.5),
        track_features.get("energy", 0.5),
        track_features.get("tempo", 120) / 200.0,
        track_features.get("acousticness", 0.5),
        track_features.get("danceability", 0.5),
    ])
    target_vec = profile.to_feature_vector()
    diff = track_vec - target_vec
    contributions = WEIGHTS * diff ** 2

    return pd.DataFrame({
        "feature":      feature_names,
        "track":        track_vec.round(3),
        "target":       target_vec.round(3),
        "diff":         diff.round(3),
        "weight":       WEIGHTS,
        "contribution": contributions.round(5),
    })


# ─────────────────────────────────────────────────────────────────────────────
# 9. EXAMPLE USAGE
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Available moods:")
    print(list_moods().to_string(index=False))
    print()

    # Get recommendations for a mood
    mood = "nostalgic"
    print(f"Fetching recommendations for: {mood}")
    print("-" * 60)

    try:
        results = recommend(mood, top_n=10)
        print(results.to_string(index=False))

        print()
        print("Score breakdown for top track:")
        top_track_features = {
            "valence":      results.iloc[0]["valence"],
            "energy":       results.iloc[0]["energy"],
            "tempo":        results.iloc[0]["tempo"],
            "acousticness": results.iloc[0]["acousticness"],
            "danceability": results.iloc[0]["danceability"],
        }
        print(explain_score(mood, top_track_features).to_string(index=False))

    except Exception as e:
        print(f"Spotify API error: {e}")
        print("Make sure SPOTIPY_CLIENT_ID and SPOTIPY_CLIENT_SECRET are set in .env")
