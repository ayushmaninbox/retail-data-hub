"""
demand_forecast.py
==================
LSTM-based demand forecasting using Gold layer sales data.

Trains a PyTorch LSTM model on daily revenue by category,
then forecasts the next 30 days with confidence intervals.

Run:
    python3 src/ml/demand_forecast.py

Output:
    data/analytics/demand_forecast.json
"""

import os, json, warnings
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import MinMaxScaler

warnings.filterwarnings("ignore")

# ── paths ───────────────────────────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GOLD = os.path.join(ROOT, "data", "gold")
OUT  = os.path.join(ROOT, "data", "analytics", "demand_forecast.json")

# ── hyper-parameters ────────────────────────────────────────────────
SEQ_LEN       = 30        # lookback window (days)
FORECAST_DAYS = 30        # prediction horizon
HIDDEN_DIM    = 64        # LSTM hidden units
NUM_LAYERS    = 2         # stacked LSTM layers
EPOCHS        = 60
BATCH_SIZE    = 32
LR            = 0.001
TRAIN_SPLIT   = 0.85


# ════════════════════════════════════════════════════════════════════
# LSTM MODEL
# ════════════════════════════════════════════════════════════════════

class SalesLSTM(nn.Module):
    """Multi-layer LSTM for time-series revenue prediction."""

    def __init__(self, input_dim, hidden_dim, num_layers, output_dim=1):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers,
                            batch_first=True, dropout=0.2 if num_layers > 1 else 0)
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, output_dim),
        )

    def forward(self, x):
        # x: (batch, seq_len, features)
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])   # take last time-step
        return out


# ════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════

def load_daily_revenue() -> pd.DataFrame:
    """Load Gold layer and aggregate daily revenue by category."""
    print("📂 Loading Gold layer …")
    fact = pd.read_parquet(os.path.join(GOLD, "fact_sales.parquet"))
    dim_date = pd.read_parquet(os.path.join(GOLD, "dim_date.parquet"))
    dim_prod = pd.read_parquet(os.path.join(GOLD, "dim_product.parquet"))

    print(f"  ✓ fact_sales: {len(fact):,} rows")
    print(f"  ✓ dim_date: {len(dim_date):,} rows")
    print(f"  ✓ dim_product: {len(dim_prod):,} rows")

    # join fact → date + product
    df = fact.merge(dim_date[["date_key", "full_date"]], on="date_key")
    df = df.merge(dim_prod[["product_sk", "category"]], on="product_sk")

    # aggregate daily revenue by category
    daily = (df.groupby(["full_date", "category"])["total_amount"]
               .sum().reset_index()
               .rename(columns={"full_date": "date", "total_amount": "revenue"}))
    daily["date"] = pd.to_datetime(daily["date"])
    daily = daily.sort_values(["category", "date"]).reset_index(drop=True)

    print(f"  ✓ Daily revenue: {len(daily):,} data points across "
          f"{daily['category'].nunique()} categories")
    return daily


def add_features(cat_df: pd.DataFrame) -> pd.DataFrame:
    """Add time-series features to a single category's daily data."""
    df = cat_df.copy()
    df["day_of_week"]   = df["date"].dt.dayofweek / 6.0          # 0-1
    df["month"]         = (df["date"].dt.month - 1) / 11.0       # 0-1
    df["day_of_month"]  = (df["date"].dt.day - 1) / 30.0         # 0-1
    df["rolling_7d"]    = df["revenue"].rolling(7, min_periods=1).mean()
    df["rolling_30d"]   = df["revenue"].rolling(30, min_periods=1).mean()
    return df


def create_sequences(data: np.ndarray, seq_len: int):
    """Create (X, y) pairs with lookback window."""
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i : i + seq_len])
        y.append(data[i + seq_len, 0])   # target = revenue (col 0)
    return np.array(X), np.array(y)


def train_category_model(cat_df: pd.DataFrame, category: str):
    """Train an LSTM for a single category and return model + scaler + metrics."""

    df = add_features(cat_df)
    feature_cols = ["revenue", "day_of_week", "month", "day_of_month",
                    "rolling_7d", "rolling_30d"]
    data = df[feature_cols].values.astype(np.float32)

    # normalize
    scaler = MinMaxScaler()
    data_scaled = scaler.fit_transform(data)

    # sequences
    X, y = create_sequences(data_scaled, SEQ_LEN)
    if len(X) < 20:
        return None, None, None, None

    # train/test split
    split = int(len(X) * TRAIN_SPLIT)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    train_ds = TensorDataset(torch.tensor(X_train), torch.tensor(y_train))
    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)

    # model
    model = SalesLSTM(input_dim=len(feature_cols), hidden_dim=HIDDEN_DIM,
                      num_layers=NUM_LAYERS)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)

    # training loop
    history = []
    for epoch in range(EPOCHS):
        model.train()
        epoch_loss = 0.0
        for xb, yb in train_dl:
            pred = model(xb).squeeze()
            loss = criterion(pred, yb)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * len(xb)
        epoch_loss /= len(X_train)
        history.append({"epoch": epoch + 1, "loss": round(epoch_loss, 6)})

    # evaluate on test set
    model.eval()
    with torch.no_grad():
        test_pred = model(torch.tensor(X_test)).squeeze().numpy()

    # inverse-transform predictions to real scale
    # create dummy arrays with same shape as scaler expects
    dummy = np.zeros((len(test_pred), len(feature_cols)))
    dummy[:, 0] = test_pred
    pred_real = scaler.inverse_transform(dummy)[:, 0]

    dummy[:, 0] = y_test
    actual_real = scaler.inverse_transform(dummy)[:, 0]

    # metrics
    mse = float(np.mean((pred_real - actual_real) ** 2))
    mae = float(np.mean(np.abs(pred_real - actual_real)))
    ss_res = np.sum((actual_real - pred_real) ** 2)
    ss_tot = np.sum((actual_real - np.mean(actual_real)) ** 2)
    r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    metrics = {"mse": round(mse, 2), "mae": round(mae, 2), "r2": round(r2, 4)}

    return model, scaler, metrics, history


def forecast_future(model, scaler, last_seq: np.ndarray, last_date: pd.Timestamp,
                    category: str, num_days: int = FORECAST_DAYS):
    """Auto-regressively forecast the next N days."""
    model.eval()
    predictions = []
    current_seq = last_seq.copy()

    feature_dim = current_seq.shape[1]

    for i in range(num_days):
        future_date = last_date + timedelta(days=i + 1)

        with torch.no_grad():
            inp = torch.tensor(current_seq[-SEQ_LEN:].reshape(1, SEQ_LEN, feature_dim))
            pred_scaled = model(inp).item()

        # inverse-transform to get real revenue
        dummy = np.zeros((1, feature_dim))
        dummy[0, 0] = pred_scaled
        pred_real = scaler.inverse_transform(dummy)[0, 0]

        # add noise for confidence interval
        std = abs(pred_real) * 0.12
        lower = max(0, pred_real - 1.96 * std)
        upper = pred_real + 1.96 * std

        predictions.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "category": category,
            "predicted_revenue": round(float(pred_real), 2),
            "lower": round(float(lower), 2),
            "upper": round(float(upper), 2),
        })

        # build next row's features
        dow  = future_date.weekday() / 6.0
        mon  = (future_date.month - 1) / 11.0
        dom  = (future_date.day - 1) / 30.0

        # rolling averages using recent predictions
        recent_revs = [p["predicted_revenue"] for p in predictions[-7:]]
        roll7  = np.mean(recent_revs)
        recent_30 = [p["predicted_revenue"] for p in predictions[-30:]]
        roll30 = np.mean(recent_30)

        new_row_raw = np.array([[pred_real, dow, mon, dom, roll7, roll30]], dtype=np.float32)
        new_row_scaled = scaler.transform(new_row_raw)
        current_seq = np.vstack([current_seq, new_row_scaled])

    return predictions


# ════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("🧠 LSTM DEMAND FORECASTING")
    print("=" * 60)
    print()

    daily = load_daily_revenue()
    categories = sorted(daily["category"].unique())

    all_forecasts = []
    all_metrics = {}
    all_history = []
    category_summaries = []

    print()
    print(f"🏋️  Training LSTM models for {len(categories)} categories …")
    print()

    for cat in categories:
        cat_data = daily[daily["category"] == cat].copy().reset_index(drop=True)

        # fill date gaps
        date_range = pd.date_range(cat_data["date"].min(), cat_data["date"].max())
        cat_data = (cat_data.set_index("date")
                    .reindex(date_range)
                    .fillna(0)
                    .rename_axis("date")
                    .reset_index())
        cat_data["category"] = cat

        print(f"  📈 {cat} ({len(cat_data)} days) … ", end="", flush=True)

        model, scaler, metrics, history = train_category_model(cat_data, cat)

        if model is None:
            print("⏭️  skipped (insufficient data)")
            continue

        print(f"R² = {metrics['r2']:.3f}, MAE = ₹{metrics['mae']:,.0f}")

        all_metrics[cat] = metrics
        all_history.extend(history[-5:])  # last 5 epochs per category

        # forecast
        df_feat = add_features(cat_data)
        feature_cols = ["revenue", "day_of_week", "month", "day_of_month",
                        "rolling_7d", "rolling_30d"]
        data_scaled = scaler.transform(df_feat[feature_cols].values.astype(np.float32))
        last_date = cat_data["date"].max()

        forecasts = forecast_future(model, scaler, data_scaled, last_date, cat)
        all_forecasts.extend(forecasts)

        # category summary
        total_30d = sum(f["predicted_revenue"] for f in forecasts)
        last_30d_actual = cat_data.tail(30)["revenue"].sum() if len(cat_data) >= 30 else 0
        change_pct = ((total_30d - last_30d_actual) / last_30d_actual * 100
                      if last_30d_actual > 0 else 0)

        category_summaries.append({
            "category": cat,
            "next_30d_predicted": round(total_30d, 2),
            "last_30d_actual": round(float(last_30d_actual), 2),
            "trend": "rising" if change_pct > 2 else ("falling" if change_pct < -2 else "stable"),
            "change_pct": round(change_pct, 1),
        })

    # aggregate metrics
    avg_r2  = np.mean([m["r2"] for m in all_metrics.values()])
    avg_mae = np.mean([m["mae"] for m in all_metrics.values()])
    avg_mse = np.mean([m["mse"] for m in all_metrics.values()])

    # build output
    total_predicted = sum(s["next_30d_predicted"] for s in category_summaries)
    top_growth = max(category_summaries, key=lambda x: x["change_pct"])

    output = {
        "computed_at": datetime.now().isoformat(),
        "model_config": {
            "architecture": "LSTM",
            "layers": NUM_LAYERS,
            "hidden_dim": HIDDEN_DIM,
            "sequence_length": SEQ_LEN,
            "epochs": EPOCHS,
            "forecast_horizon_days": FORECAST_DAYS,
        },
        "model_metrics": {
            "avg_r2": round(avg_r2, 4),
            "avg_mae": round(avg_mae, 2),
            "avg_mse": round(avg_mse, 2),
            "per_category": all_metrics,
        },
        "summary": {
            "total_30d_predicted_revenue": round(total_predicted, 2),
            "top_growth_category": top_growth["category"],
            "top_growth_pct": top_growth["change_pct"],
            "categories_trained": len(all_metrics),
        },
        "category_summary": sorted(category_summaries,
                                    key=lambda x: x["next_30d_predicted"],
                                    reverse=True),
        "forecast": all_forecasts,
        "training_history": all_history,
    }

    # save
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, default=str)

    print()
    print("=" * 60)
    print(f"✅ LSTM Forecasting complete!")
    print(f"   Categories trained : {len(all_metrics)}")
    print(f"   Average R²         : {avg_r2:.3f}")
    print(f"   Average MAE        : ₹{avg_mae:,.0f}")
    print(f"   30-day forecast    : ₹{total_predicted:,.0f}")
    print(f"   Top growth         : {top_growth['category']} (+{top_growth['change_pct']}%)")
    print(f"   Output             : {OUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()
