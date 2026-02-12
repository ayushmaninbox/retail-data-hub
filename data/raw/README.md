# 📁 data/raw/

## Purpose
Original source files that simulate 3 separate retail systems. These are the **starting point** of the entire pipeline — nothing in this folder gets modified.

## Files That Will Go Here

| File | Format | Simulates | Source |
|---|---|---|---|
| `pos_sales.csv` | CSV | POS billing system from 50+ stores | UCI Online Retail dataset, re-mapped to Indian cities |
| `web_orders.json` | JSON | E-commerce website order stream | Generated with Faker |
| `warehouse_inventory.csv` | CSV | Warehouse stock levels per product per location | Generated with Faker |
| `shipments.csv` | CSV | Logistics/delivery records | Generated with Faker |

## Key Columns Expected

### pos_sales.csv
`invoice_no`, `stock_code`, `description`, `quantity`, `invoice_date`, `unit_price`, `customer_id`, `store_id`, `city`, `state`

### web_orders.json
`order_id`, `customer_id`, `product_id`, `description`, `quantity`, `unit_price`, `order_date`, `city`, `state`, `payment_method`

### warehouse_inventory.csv
`snapshot_date`, `store_id`, `product_id`, `stock_on_hand`, `reorder_point`, `warehouse_city`

### shipments.csv
`shipment_id`, `order_id`, `ship_date`, `delivery_date`, `origin_store_id`, `destination_city`, `status`

## Notes
- Raw data is **never modified** — the pipeline reads from here and writes to `bronze/`
- Data generation scripts live in `src/data_generation/`
