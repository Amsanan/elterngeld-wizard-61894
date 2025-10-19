-- Create function to delete antrag and all related data including storage files
CREATE OR REPLACE FUNCTION public.delete_antrag_cascade(p_antrag_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_file RECORD;
BEGIN
  -- Delete files from storage bucket for this antrag
  FOR v_file IN 
    SELECT storage_path 
    FROM public.user_files 
    WHERE antrag_id = p_antrag_id 
    AND storage_path IS NOT NULL
  LOOP
    -- Delete from storage.objects
    DELETE FROM storage.objects 
    WHERE bucket_id = 'application-documents' 
    AND name = v_file.storage_path;
  END LOOP;

  -- Delete extraction_logs related to this antrag
  DELETE FROM public.extraction_logs 
  WHERE antrag_id = p_antrag_id;

  -- Delete user_files related to this antrag
  DELETE FROM public.user_files 
  WHERE antrag_id = p_antrag_id;

  -- Delete all form-related tables (these should cascade automatically, but being explicit)
  DELETE FROM public.kind WHERE antrag_id = p_antrag_id;
  DELETE FROM public.elternteil WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2a_alleinerziehende WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2b_elternteil WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2c_wohnsitz WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2c_wohnsitz_aufenthalt WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2c_kind_adresse WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2d_arbeit_im_ausland WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2e_antragstellende WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2f_staatsangehoerigkeit WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2g_familienstand WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_3a_betreuung_kind WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_3b_elternkind_beziehung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_3c_adoption WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_4_weitere_kinder_info WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_5_krankenversicherung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_6a_gesamteinkommen WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_6b_mindestbetrag WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_7a_bisherige_erwerbstaetigkeit WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_8a_einkomen_vor_geburt_bestimmt WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_8b_steuern_und_abgaben WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_9_einkommen_ersatz_leistungen WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_10_mutterschafts_leistungen WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16a_bankverbindung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16b_kontakt WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16c_mitteilung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16d_unterschrift WHERE antrag_id = p_antrag_id;

  -- Finally delete the antrag itself
  DELETE FROM public.antrag WHERE id = p_antrag_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_antrag_cascade(UUID) TO authenticated;