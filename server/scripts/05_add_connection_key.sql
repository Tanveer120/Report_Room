-- =====================================================
-- Report Room — Add connection_key to reports table
-- =====================================================

DECLARE
  v_col_exists NUMBER;
BEGIN
  SELECT COUNT(*)
  INTO v_col_exists
  FROM user_tab_cols
  WHERE table_name = 'REPORTS' AND column_name = 'CONNECTION_KEY';

  IF v_col_exists = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE reports ADD (connection_key VARCHAR2(100) DEFAULT ''default'')';
  END IF;
END;
/
