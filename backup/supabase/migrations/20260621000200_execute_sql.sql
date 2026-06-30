CREATE OR REPLACE FUNCTION public.execute_sql_query(query_text text)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
    result_json jsonb;
BEGIN
    IF query_text ~* '^\s*SELECT' THEN
        EXECUTE 'SELECT jsonb_agg(t) FROM (' || query_text || ') t' INTO result_json;
        RETURN jsonb_build_object('status', 'success', 'data', COALESCE(result_json, '[]'::jsonb));
    ELSE
        EXECUTE query_text;
        RETURN jsonb_build_object('status', 'success');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
