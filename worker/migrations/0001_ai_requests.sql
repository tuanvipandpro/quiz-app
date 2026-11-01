CREATE TABLE ai_requests (
  uid TEXT NOT NULL,
  request_id TEXT NOT NULL,
  day TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'done', 'failed')),
  created_at INTEGER NOT NULL,
  result TEXT,
  error TEXT,
  PRIMARY KEY (uid, request_id)
);
CREATE INDEX ai_requests_day ON ai_requests(day);
CREATE INDEX ai_requests_owner_day ON ai_requests(uid, day);
-- Limits are deployment invariants; tests compare these with AI_POLICY.
CREATE TRIGGER ai_reserve BEFORE INSERT ON ai_requests BEGIN
  SELECT CASE WHEN (SELECT count(*) FROM ai_requests WHERE uid = NEW.uid AND day = NEW.day) >= 5
    THEN RAISE(ABORT, 'USER_LIMIT') END;
  SELECT CASE WHEN (SELECT count(*) FROM ai_requests WHERE day = NEW.day) >= 100
    THEN RAISE(ABORT, 'GLOBAL_LIMIT') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM ai_requests WHERE uid = NEW.uid AND state = 'pending')
    THEN RAISE(ABORT, 'BUSY') END;
END;
