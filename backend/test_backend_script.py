#!/usr/bin/env python3
"""
Simple test runner for backend/mood_music_recommender.py.

Runs lightweight assertions without external test frameworks:
  python backend/test_backend_script.py
"""

from __future__ import annotations

import sys

import pandas as pd

from mood_music_recommender import (
    LOOKUP_TABLE,
    apply_diversity_filter,
    explain_score,
    list_moods,
    recommend,
    score_track,
)


class FakeSpotifyClient:
    """Minimal Spotify client mock for deterministic backend tests."""

    def recommendations(self, **kwargs):
        limit = kwargs.get("limit", 50)
        tracks = [
            {
                "id": "t1",
                "name": "Track One",
                "artists": [{"id": "a1", "name": "Artist A"}],
                "external_urls": {"spotify": "https://open.spotify.com/track/t1"},
            },
            {
                "id": "t2",
                "name": "Track Two",
                "artists": [{"id": "a1", "name": "Artist A"}],
                "external_urls": {"spotify": "https://open.spotify.com/track/t2"},
            },
            {
                "id": "t3",
                "name": "Track Three",
                "artists": [{"id": "a2", "name": "Artist B"}],
                "external_urls": {"spotify": "https://open.spotify.com/track/t3"},
            },
            {
                "id": "t4",
                "name": "Track Four",
                "artists": [{"id": "a3", "name": "Artist C"}],
                "external_urls": {"spotify": "https://open.spotify.com/track/t4"},
            },
        ]
        return {"tracks": tracks[:limit]}

    def audio_features(self, track_ids):
        feature_map = {
            "t1": {
                "id": "t1",
                "valence": 0.52,
                "energy": 0.32,
                "tempo": 84,
                "acousticness": 0.60,
                "danceability": 0.48,
            },
            "t2": {
                "id": "t2",
                "valence": 0.50,
                "energy": 0.30,
                "tempo": 82,
                "acousticness": 0.62,
                "danceability": 0.46,
            },
            "t3": {
                "id": "t3",
                "valence": 0.10,
                "energy": 0.15,
                "tempo": 60,
                "acousticness": 0.85,
                "danceability": 0.20,
            },
            "t4": {
                "id": "t4",
                "valence": 0.70,
                "energy": 0.75,
                "tempo": 130,
                "acousticness": 0.15,
                "danceability": 0.72,
            },
        }
        return [feature_map.get(track_id) for track_id in track_ids]


def test_list_moods_has_expected_columns() -> None:
    moods_df = list_moods()
    expected_cols = {
        "mood",
        "zone",
        "valence",
        "energy",
        "tempo",
        "mode",
        "acousticness",
        "danceability",
        "instrumentalness",
        "seed_genres",
    }
    assert expected_cols.issubset(set(moods_df.columns))
    assert not moods_df.empty


def test_score_track_exact_match_is_zero() -> None:
    profile = LOOKUP_TABLE["nostalgic"]
    features = {
        "valence": profile.valence,
        "energy": profile.energy,
        "tempo": profile.tempo,
        "acousticness": profile.acousticness,
        "danceability": profile.danceability,
    }
    score = score_track(features, profile)
    assert abs(score) < 1e-12


def test_apply_diversity_filter_limits_artist_tracks() -> None:
    ranked = [
        {"artists": [{"id": "x"}], "score": 0.1},
        {"artists": [{"id": "x"}], "score": 0.2},
        {"artists": [{"id": "x"}], "score": 0.3},
        {"artists": [{"id": "y"}], "score": 0.4},
    ]
    filtered = apply_diversity_filter(ranked, max_per_artist=2)
    artist_ids = [track["artists"][0]["id"] for track in filtered]
    assert artist_ids.count("x") == 2


def test_recommend_with_fake_client_returns_dataframe() -> None:
    results = recommend(
        mood="nostalgic",
        top_n=3,
        max_per_artist=1,
        sp=FakeSpotifyClient(),
    )
    assert isinstance(results, pd.DataFrame)
    assert not results.empty
    assert len(results) <= 3
    assert results["rank"].tolist() == list(range(1, len(results) + 1))
    assert len(set(results["artist"])) == len(results["artist"])


def test_recommend_invalid_mood_raises() -> None:
    try:
        recommend("invalid-mood", sp=FakeSpotifyClient())
    except ValueError as exc:
        assert "Unknown mood" in str(exc)
    else:
        raise AssertionError("Expected ValueError for invalid mood")


def test_explain_score_shape() -> None:
    breakdown = explain_score(
        "nostalgic",
        {
            "valence": 0.52,
            "energy": 0.32,
            "tempo": 84,
            "acousticness": 0.60,
            "danceability": 0.48,
        },
    )
    assert len(breakdown) == 5
    assert "contribution" in breakdown.columns


def run_tests() -> None:
    tests = [
        test_list_moods_has_expected_columns,
        test_score_track_exact_match_is_zero,
        test_apply_diversity_filter_limits_artist_tracks,
        test_recommend_with_fake_client_returns_dataframe,
        test_recommend_invalid_mood_raises,
        test_explain_score_shape,
    ]

    passed = 0
    for test in tests:
        test()
        print(f"[PASS] {test.__name__}")
        passed += 1

    print(f"\nAll tests passed ({passed}/{len(tests)}).")


if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError as err:
        print(f"[FAIL] {err}")
        sys.exit(1)
    except Exception as err:
        print(f"[ERROR] Unexpected error: {err}")
        sys.exit(1)
