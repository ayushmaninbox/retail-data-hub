"""
market_basket.py
================
Market Basket Analysis using the Apriori algorithm on unified sales data.

This is the project's USP — omnichannel basket analysis across POS (in-store)
and Web (online) channels. Finds cross-channel purchase patterns that
pure-play retailers like Amazon or Flipkart cannot discover.

Features:
  1. Standard basket analysis (items bought in same transaction)
  2. Cross-channel analysis (items bought by same customer across POS + Web)
  3. Category-level associations
  4. Actionable recommendations with confidence & lift scores

Output: data/analytics/market_basket.json

Requires: mlxtend (pip install mlxtend)
"""

import os
import json
import warnings
import pandas as pd
from datetime import datetime

# Suppress convergence warnings from mlxtend
warnings.filterwarnings("ignore")

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GOLD_DIR = os.path.join(ROOT_DIR, "data", "gold")
ANALYTICS_DIR = os.path.join(ROOT_DIR, "data", "analytics")
os.makedirs(ANALYTICS_DIR, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════

def load_sales():
    """Load fact_sales + dim_product from Gold layer."""
    fact_sales = pd.read_parquet(os.path.join(GOLD_DIR, "fact_sales.parquet"))
    dim_product = pd.read_parquet(os.path.join(GOLD_DIR, "dim_product.parquet"))

    # Join to get product names
    sales = fact_sales.merge(dim_product, on="product_sk", how="left")
    print(f"  ✓ Loaded {len(sales):,} sales with product details")
    return sales


# ══════════════════════════════════════════════════════════════════════
# 1. STANDARD BASKET ANALYSIS (same transaction)
# ══════════════════════════════════════════════════════════════════════

def standard_basket_analysis(sales_df, min_support=0.005, min_confidence=0.05):
    """
    Find items frequently bought together in the same transaction.
    Uses the Apriori algorithm from mlxtend.
    """
    from mlxtend.frequent_patterns import apriori, association_rules
    from mlxtend.preprocessing import TransactionEncoder

    print("  🛒 Building transaction baskets …")

    # Group by transaction to get baskets
    baskets = sales_df.groupby("transaction_id")["product_name"].apply(list).tolist()

    # Filter baskets with 2+ items
    multi_item_baskets = [b for b in baskets if len(b) >= 2]
    print(f"     {len(multi_item_baskets):,} multi-item transactions (out of {len(baskets):,} total)")

    if len(multi_item_baskets) < 10:
        print("     ⚠️  Too few multi-item transactions for meaningful analysis")
        return {"itemsets": [], "rules": [], "stats": {"multi_item_baskets": len(multi_item_baskets)}}

    # One-hot encode
    te = TransactionEncoder()
    te_array = te.fit_transform(multi_item_baskets)
    basket_df = pd.DataFrame(te_array, columns=te.columns_)

    # Run Apriori
    print(f"  ⚡ Running Apriori (min_support={min_support}) …")
    frequent_items = apriori(basket_df, min_support=min_support, use_colnames=True)

    if frequent_items.empty:
        print("     ⚠️  No frequent itemsets found — try lowering min_support")
        return {"itemsets": [], "rules": [], "stats": {"multi_item_baskets": len(multi_item_baskets)}}

    print(f"     Found {len(frequent_items)} frequent itemsets")

    # Generate rules
    rules = association_rules(frequent_items, metric="confidence",
                              min_threshold=min_confidence, num_itemsets=len(frequent_items))

    # Convert frozensets to lists for JSON serialization
    rules_list = []
    for _, row in rules.head(30).iterrows():
        rules_list.append({
            "antecedents": list(row["antecedents"]),
            "consequents": list(row["consequents"]),
            "support": round(float(row["support"]), 4),
            "confidence": round(float(row["confidence"]), 4),
            "lift": round(float(row["lift"]), 4),
            "conviction": round(float(row["conviction"]), 4) if row["conviction"] != float("inf") else 999.0,
        })

    rules_list.sort(key=lambda x: x["lift"], reverse=True)

    itemsets_list = []
    for _, row in frequent_items.sort_values("support", ascending=False).head(20).iterrows():
        itemsets_list.append({
            "items": list(row["itemsets"]),
            "support": round(float(row["support"]), 4),
        })

    return {
        "itemsets": itemsets_list,
        "rules": rules_list,
        "stats": {
            "total_transactions": len(baskets),
            "multi_item_baskets": len(multi_item_baskets),
            "frequent_itemsets_found": len(frequent_items),
            "association_rules_found": len(rules),
        },
    }


# ══════════════════════════════════════════════════════════════════════
# 2. CROSS-CHANNEL BASKET ANALYSIS (same customer, different channels)
# ══════════════════════════════════════════════════════════════════════

def cross_channel_analysis(sales_df, min_support=0.008, min_confidence=0.05):
    """
    USP: Find products bought by the same customer across POS and Web channels.
    This reveals patterns like: "Customers who buy Basmati Rice in-store
    also order Cooking Oil online."
    """
    from mlxtend.frequent_patterns import apriori, association_rules
    from mlxtend.preprocessing import TransactionEncoder

    print("  🔗 Building cross-channel customer baskets …")

    # Create baskets per customer with channel prefix
    def make_channel_basket(group):
        items = []
        for _, row in group.iterrows():
            channel_prefix = "🏪" if row["channel"] == "POS" else "🌐"
            items.append(f"{channel_prefix} {row['product_name']}")
        return list(set(items))  # unique items per customer

    customer_baskets = sales_df.groupby("customer_sk").apply(make_channel_basket).tolist()

    # Only keep customers who bought from BOTH channels
    cross_channel_baskets = []
    for basket in customer_baskets:
        has_pos = any(item.startswith("🏪") for item in basket)
        has_web = any(item.startswith("🌐") for item in basket)
        if has_pos and has_web and len(basket) >= 2:
            cross_channel_baskets.append(basket)

    print(f"     {len(cross_channel_baskets):,} cross-channel customers found")

    if len(cross_channel_baskets) < 10:
        print("     ⚠️  Too few cross-channel customers")
        return {"rules": [], "stats": {"cross_channel_customers": len(cross_channel_baskets)}}

    # One-hot encode
    te = TransactionEncoder()
    te_array = te.fit_transform(cross_channel_baskets)
    basket_df = pd.DataFrame(te_array, columns=te.columns_)

    # Run Apriori
    print(f"  ⚡ Running cross-channel Apriori (min_support={min_support}) …")
    frequent = apriori(basket_df, min_support=min_support, use_colnames=True)

    if frequent.empty:
        return {"rules": [], "stats": {"cross_channel_customers": len(cross_channel_baskets)}}

    rules = association_rules(frequent, metric="confidence",
                              min_threshold=min_confidence, num_itemsets=len(frequent))

    # Filter: only rules where antecedent and consequent are different channels
    cross_rules = []
    for _, row in rules.iterrows():
        ant_channels = {item[:2] for item in row["antecedents"]}
        con_channels = {item[:2] for item in row["consequents"]}

        if ant_channels != con_channels:  # different channels
            cross_rules.append({
                "if_buys": list(row["antecedents"]),
                "then_buys": list(row["consequents"]),
                "support": round(float(row["support"]), 4),
                "confidence": round(float(row["confidence"]), 4),
                "lift": round(float(row["lift"]), 4),
            })

    cross_rules.sort(key=lambda x: x["lift"], reverse=True)

    return {
        "rules": cross_rules[:20],
        "stats": {
            "total_customers": len(customer_baskets),
            "cross_channel_customers": len(cross_channel_baskets),
            "frequent_itemsets": len(frequent),
            "cross_channel_rules": len(cross_rules),
        },
    }


# ══════════════════════════════════════════════════════════════════════
# 3. CATEGORY-LEVEL ASSOCIATIONS
# ══════════════════════════════════════════════════════════════════════

def category_basket_analysis(sales_df, min_support=0.03, min_confidence=0.1):
    """Category-level basket analysis (coarser but more interpretable)."""
    from mlxtend.frequent_patterns import apriori, association_rules
    from mlxtend.preprocessing import TransactionEncoder

    print("  📦 Building category baskets …")

    # Group by transaction → list of categories
    baskets = sales_df.groupby("transaction_id")["category"].apply(
        lambda x: list(set(x))
    ).tolist()

    multi_cat = [b for b in baskets if len(b) >= 2]
    print(f"     {len(multi_cat):,} multi-category transactions")

    if len(multi_cat) < 10:
        return {"rules": [], "stats": {"multi_category_baskets": len(multi_cat)}}

    te = TransactionEncoder()
    te_array = te.fit_transform(multi_cat)
    basket_df = pd.DataFrame(te_array, columns=te.columns_)

    frequent = apriori(basket_df, min_support=min_support, use_colnames=True)
    if frequent.empty:
        return {"rules": [], "stats": {"multi_category_baskets": len(multi_cat)}}

    rules = association_rules(frequent, metric="confidence",
                              min_threshold=min_confidence, num_itemsets=len(frequent))

    rules_list = []
    for _, row in rules.sort_values("lift", ascending=False).head(15).iterrows():
        rules_list.append({
            "if_category": list(row["antecedents"]),
            "then_category": list(row["consequents"]),
            "support": round(float(row["support"]), 4),
            "confidence": round(float(row["confidence"]), 4),
            "lift": round(float(row["lift"]), 4),
        })

    return {
        "rules": rules_list,
        "stats": {
            "multi_category_baskets": len(multi_cat),
            "frequent_itemsets": len(frequent),
            "rules_found": len(rules),
        },
    }


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def run_market_basket():
    print("=" * 60)
    print("🛒 MARKET BASKET ANALYSIS — Omnichannel Apriori")
    print("=" * 60)

    print("\n📂 Loading Gold layer …")
    sales = load_sales()

    print("\n🔬 Analysis 1: Standard Basket (same transaction) …")
    standard = standard_basket_analysis(sales)

    print(f"\n🔬 Analysis 2: Cross-Channel (same customer, POS ↔ Web) …")
    cross_channel = cross_channel_analysis(sales)

    print(f"\n🔬 Analysis 3: Category-Level Associations …")
    category = category_basket_analysis(sales)

    results = {
        "computed_at": datetime.now().isoformat(),
        "standard_basket": standard,
        "cross_channel": cross_channel,
        "category_basket": category,
    }

    # Print highlights
    print(f"\n{'=' * 60}")
    print(f"📊 RESULTS SUMMARY")
    print(f"{'=' * 60}")

    print(f"\n  Standard Basket:")
    print(f"     Frequent itemsets: {standard['stats'].get('frequent_itemsets_found', 0)}")
    print(f"     Association rules: {standard['stats'].get('association_rules_found', 0)}")
    if standard["rules"]:
        top = standard["rules"][0]
        print(f"     Best rule: {top['antecedents']} → {top['consequents']} (lift={top['lift']})")

    print(f"\n  Cross-Channel (USP):")
    print(f"     Cross-channel customers: {cross_channel['stats'].get('cross_channel_customers', 0)}")
    print(f"     Cross-channel rules: {cross_channel['stats'].get('cross_channel_rules', 0)}")
    if cross_channel["rules"]:
        top = cross_channel["rules"][0]
        print(f"     Best: {top['if_buys']} → {top['then_buys']} (lift={top['lift']})")

    print(f"\n  Category Basket:")
    if category["rules"]:
        for rule in category["rules"][:3]:
            print(f"     {rule['if_category']} → {rule['then_category']} (lift={rule['lift']})")

    # Save
    output_path = os.path.join(ANALYTICS_DIR, "market_basket.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Saved → {output_path}")
    print("=" * 60)

    return results


if __name__ == "__main__":
    run_market_basket()
