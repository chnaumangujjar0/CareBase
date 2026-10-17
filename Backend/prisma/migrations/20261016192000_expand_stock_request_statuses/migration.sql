ALTER TABLE "StockRequest"
  DROP CONSTRAINT IF EXISTS "StockRequest_status_check";

ALTER TABLE "StockRequest"
  ADD CONSTRAINT "StockRequest_status_check"
  CHECK ("status" IN (
    'pending',
    'approved',
    'rejected',
    'dispatched',
    'received',
    'partially_received',
    'not_received'
  ));
