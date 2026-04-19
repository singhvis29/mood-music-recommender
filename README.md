# Mood Music Recommender

A mood-based music recommendation engine using the Spotify API and the circumplex model of emotion.

## How it works

1. User selects or describes their mood
2. A lookup table maps the mood to a target Spotify audio feature vector `(valence, energy, tempo, mode, acousticness, danceability)`
3. Spotify's Recommendations API returns 50 candidate tracks
4. Weighted Euclidean distance scores each track against the target
5. A diversity filter (max 2 tracks per artist) is applied
6. Top 10 results are returned

## Project structure

```
mood-music-recommender/
├── backend/
│   └── mood_music_recommender.py   # Core engine: lookup table, scoring, Spotify API
├── data/
│   └── mood_lookup_table.csv       # Exported lookup table (all moods + feature targets)
├── assets/
│   └── circumplex_model_of_emotion.svg   # Circumplex model reference diagram
├── .env.example                    # Environment variable template
├── requirements.txt
└── README.md
```

## Setup

```bash
# 1. Clone
git clone https://github.com/singhvis29/mood-music-recommender.git
cd mood-music-recommender

# 2. Install dependencies
pip install -r requirements.txt

# 3. Add Spotify credentials
cp .env.example .env
# Edit .env and fill in your Spotify API keys
# Get them free at: https://developer.spotify.com/dashboard

# 4. Run
python backend/mood_music_recommender.py
```

## Supported moods

| Zone     | Moods |
|----------|-------|
| Positive | joyful, excited, euphoric, hopeful, empowered, playful |
| Calm     | content, serene, romantic |
| Negative | melancholy, sad, grief, anxious, angry, stressed, bored, lonely |
| Complex  | nostalgic, focused, tired, dreamy, pensive |

## Audio feature weights

| Feature      | Weight | Rationale |
|--------------|--------|-----------|
| valence      | 0.40   | Primary axis — pleasantness |
| energy       | 0.35   | Primary axis — arousal |
| tempo        | 0.12   | Supporting |
| acousticness | 0.08   | Supporting |
| danceability | 0.05   | Refinement |

## Example usage

```python
from backend.mood_music_recommender import recommend, list_moods

# See all available moods
print(list_moods())

# Get top 10 recommendations for a mood
results = recommend("nostalgic", top_n=10)
print(results)
```

## Tech stack

- Python 3.11+
- [Spotipy](https://spotipy.readthedocs.io/) — Spotify Web API wrapper
- Pandas + NumPy — scoring and ranking
- Spotify Recommendations API
