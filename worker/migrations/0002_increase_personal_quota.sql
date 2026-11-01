-- Preserve all attempts and private results; only raise the personal allowance.
DROP TRIGGER ai_reserve;
CREATE TRIGGER ai_reserve BEFORE INSERT ON ai_requests BEGIN
  SELECT CASE WHEN (SELECT count(*) FROM ai_requests WHERE uid = NEW.uid AND day = NEW.day) >= 20
    THEN RAISE(ABORT, 'USER_LIMIT') END;
  SELECT CASE WHEN (SELECT count(*) FROM ai_requests WHERE day = NEW.day) >= 100
    THEN RAISE(ABORT, 'GLOBAL_LIMIT') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM ai_requests WHERE uid = NEW.uid AND state = 'pending')
    THEN RAISE(ABORT, 'BUSY') END;
END;
