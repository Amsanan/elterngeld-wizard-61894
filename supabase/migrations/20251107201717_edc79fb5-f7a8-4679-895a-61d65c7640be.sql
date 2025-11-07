-- Create function to get table columns from information_schema
CREATE OR REPLACE FUNCTION public.get_table_columns(table_names text[])
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = ANY(table_names)
  ORDER BY c.table_name, c.ordinal_position;
END;
$$;