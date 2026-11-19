"""可选的 FastAPI 数据接口与模拟引擎。

静态站点（GitHub Pages）已内置同一套前端模拟引擎；本服务用于：
1. 为外部应用提供 JSON 接口；
2. 用 SQLite 持久化用户的模拟记录。
"""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"
DB_PATH = ROOT / "data" / "simulations.db"

app = FastAPI(title="Cultural Discount Lab API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(filename: str) -> Any:
    with (DATA_DIR / filename).open("r", encoding="utf-8") as f:
        return json.load(f)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                score INTEGER NOT NULL,
                discount REAL NOT NULL,
                choices TEXT NOT NULL,
                result TEXT NOT NULL
            )
            """
        )
        conn.commit()


STAGE_PROFILE: Dict[str, Dict[str, float]] = {
    "品牌地基": {"exposure": 3, "followers": 0.3},
    "内地破圈": {"exposure": 10, "followers": 1.4},
    "东南亚深耕": {"exposure": 6, "followers": 0.7},
    "欧美试水": {"exposure": 8, "followers": 0.9},
    "拉美本地化": {"exposure": 7, "followers": 0.8},
    "全球扩张": {"exposure": 12, "followers": 1.5},
    "技术展望": {"exposure": 5, "followers": 0.5},
}


def option_impact(decision: Dict[str, Any], option: Dict[str, Any]) -> Dict[str, Any]:
    profile = STAGE_PROFILE.get(decision["stage"], {"exposure": 8, "followers": 0.6})
    e = option["effects"]
    score = (
        0.5
        + 4 * e.get("reach", 0)
        + 2.5 * e.get("credibility", 0)
        + 3 * max(0, -e.get("discount", 0))
        + 2 * e.get("community", 0)
        + 1.5 * e.get("tourism", 0)
        - 1.5 * max(0, e.get("risk", 0))
        - 0.5 * e.get("budget", 0)
    )
    return {
        "optionId": option["id"],
        "label": option["label"],
        "exposureDeltaM": max(1, round(profile["exposure"] * score)),
        "followersDeltaM": max(0.01, round(profile["followers"] * score, 2)),
        "score": round(score, 3),
    }


def predict_trajectory(choices: Dict[str, str]) -> Dict[str, Any]:
    decisions = load_json("decisions.json")["decisions"]
    constants = load_json("simulation-rules.json")["constants"]
    exposure = constants.get("initialExposureM", 180)
    followers = constants.get("initialFollowersM", 25)
    points = []
    for index, decision in enumerate(decisions, start=1):
        choice_id = choices.get(decision["id"], decision["options"][0]["id"])
        option = next(
            (item for item in decision["options"] if item["id"] == choice_id),
            decision["options"][0],
        )
        impact = option_impact(decision, option)
        exposure += impact["exposureDeltaM"]
        followers += impact["followersDeltaM"]
        points.append(
            {
                "step": index,
                "label": f"{index}. {decision['title']}",
                "shortLabel": str(index),
                "stage": decision["stage"],
                "chosenLabel": option["label"],
                "exposureDeltaM": impact["exposureDeltaM"],
                "followersDeltaM": impact["followersDeltaM"],
                "exposureM": round(exposure),
                "followersM": round(followers, 1),
            }
        )
    return {
        "points": points,
        "finalExposureM": round(exposure),
        "finalFollowersM": round(followers, 1),
    }


def simulate(choices: Dict[str, str]) -> Dict[str, Any]:
    decision_data = load_json("decisions.json")
    rules = load_json("simulation-rules.json")
    constants = rules["constants"]
    decisions = decision_data["decisions"]

    metrics: Dict[str, float] = {
        "discount": constants["initialDiscount"],
        "reach": constants["initialReach"],
        "credibility": constants["initialCredibility"],
        "community": constants["initialCommunity"],
        "tourism": constants["initialTourism"],
        "budgetUsed": 0.0,
        "risk": constants["initialRisk"],
    }
    curve = [{"step": 0, "label": "起点", "discount": metrics["discount"]}]

    for index, decision in enumerate(decisions, start=1):
        choice_id = choices.get(decision["id"], decision["options"][0]["id"])
        option = next(
            (item for item in decision["options"] if item["id"] == choice_id),
            decision["options"][0],
        )
        effects = option["effects"]

        metrics["discount"] = clamp(metrics["discount"] + effects.get("discount", 0), 0.05, 0.95)
        metrics["reach"] = clamp(metrics["reach"] + effects.get("reach", 0), 0, 1)
        metrics["credibility"] = clamp(metrics["credibility"] + effects.get("credibility", 0), 0, 1)
        metrics["community"] = clamp(metrics["community"] + effects.get("community", 0), 0, 1)
        metrics["tourism"] = clamp(metrics["tourism"] + effects.get("tourism", 0), 0, 1)
        metrics["budgetUsed"] += effects.get("budget", 0)
        metrics["risk"] = clamp(metrics["risk"] + effects.get("risk", 0), 0, 1)

        curve.append(
            {
                "step": index,
                "label": f"{index}. {decision['title']}",
                "discount": round(metrics["discount"], 4),
            }
        )

    over_budget = max(0.0, metrics["budgetUsed"] - constants["budgetCap"])
    over_risk = max(0.0, metrics["risk"] - 0.25)
    score = round(
        100
        * (
            0.35 * (1 - metrics["discount"])
            + 0.25 * metrics["reach"]
            + 0.20 * metrics["credibility"]
            + 0.12 * metrics["community"]
            + 0.08 * metrics["tourism"]
        )
        - 12 * over_budget
        - 8 * over_risk
    )

    return {
        "metrics": metrics,
        "curve": curve,
        "successScore": score,
        "predictedViewsM": round(
            constants["baselineViewsM"] * (0.35 + 0.65 * metrics["reach"]) * (1.25 - metrics["discount"])
        ),
        "predictedAudience": round(
            constants["baselineAudience"] * (0.30 + 0.70 * metrics["reach"]) * (1.20 - metrics["discount"])
        ),
        "predictedBoxOfficeUsdM": round(
            constants["baselineBoxOfficeUsdM"] * (0.25 + 0.75 * metrics["tourism"]) * (1.15 - metrics["discount"])
        ),
        "predictedTourismCnyM": round(constants["baselineTourismCnyM"] * metrics["tourism"]),
        "overBudget": over_budget,
        "overRisk": over_risk,
        "prediction": predict_trajectory(choices),
    }


class SimulateRequest(BaseModel):
    choices: Dict[str, str]


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "cultural-discount-lab"}


@app.get("/api/cities")
def cities(year: Optional[int] = None) -> Any:
    data = load_json("cities.json")
    items = data["cities"] if year is None else [c for c in data["cities"] if c["year"] <= year]
    return {"metadata": data["metadata"], "cities": items}


@app.get("/api/timeseries")
def timeseries() -> Any:
    return load_json("timeseries.json")


@app.get("/api/decisions")
def decisions() -> Any:
    return load_json("decisions.json")


@app.get("/api/theory-map")
def theory_map() -> Any:
    return load_json("theory-map.json")


@app.get("/api/graph")
def graph() -> Any:
    return load_json("graph.json")


@app.get("/api/rules")
def rules() -> Any:
    return load_json("simulation-rules.json")


@app.post("/api/simulate")
def simulate_endpoint(payload: SimulateRequest) -> Any:
    result = simulate(payload.choices)
    created_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO runs (created_at, score, discount, choices, result) VALUES (?, ?, ?, ?, ?)",
            (
                created_at,
                result["successScore"],
                result["metrics"]["discount"],
                json.dumps(payload.choices, ensure_ascii=False),
                json.dumps(result, ensure_ascii=False),
            ),
        )
        conn.commit()
    return result


@app.get("/api/history")
def history(limit: int = 20) -> Any:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, created_at, score, discount, choices FROM runs ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
