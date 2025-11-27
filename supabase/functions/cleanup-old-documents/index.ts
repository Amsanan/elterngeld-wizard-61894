import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user token for auth check
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user has admin role
    const { data: roles, error: rolesError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !roles) {
      console.error('Insufficient permissions for user:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Admin user verified:', user.id);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting document cleanup process...');

    // Get all enabled cleanup settings
    const { data: settings, error: settingsError } = await supabase
      .from('document_cleanup_settings')
      .select('*')
      .eq('is_enabled', true);

    if (settingsError) {
      console.error('Error fetching cleanup settings:', settingsError);
      throw settingsError;
    }

    console.log(`Found ${settings?.length || 0} users with cleanup enabled`);

    let totalDeleted = 0;
    const results = [];

    for (const setting of settings || []) {
      console.log(`Processing cleanup for user ${setting.user_id}, interval: ${setting.cleanup_interval_hours}h`);
      
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - setting.cleanup_interval_hours);

      // List all files in the user's folder
      const { data: files, error: listError } = await supabase.storage
        .from('application-documents')
        .list(setting.user_id);

      if (listError) {
        console.error(`Error listing files for user ${setting.user_id}:`, listError);
        results.push({
          user_id: setting.user_id,
          error: listError.message,
          deleted: 0
        });
        continue;
      }

      // Filter files older than the cutoff date
      const filesToDelete = files?.filter(file => {
        const fileDate = new Date(file.created_at);
        return fileDate < cutoffDate;
      }) || [];

      console.log(`Found ${filesToDelete.length} files to delete for user ${setting.user_id}`);

      if (filesToDelete.length > 0) {
        // Delete old files
        const filePaths = filesToDelete.map(file => `${setting.user_id}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from('application-documents')
          .remove(filePaths);

        if (deleteError) {
          console.error(`Error deleting files for user ${setting.user_id}:`, deleteError);
          results.push({
            user_id: setting.user_id,
            error: deleteError.message,
            deleted: 0
          });
          continue;
        }

        totalDeleted += filesToDelete.length;
        console.log(`Successfully deleted ${filesToDelete.length} files for user ${setting.user_id}`);
      }

      // Update last run timestamp
      await supabase
        .from('document_cleanup_settings')
        .update({ last_run_at: new Date().toISOString() })
        .eq('user_id', setting.user_id);

      results.push({
        user_id: setting.user_id,
        deleted: filesToDelete.length,
        cutoff_date: cutoffDate.toISOString()
      });
    }

    console.log(`Cleanup completed. Total files deleted: ${totalDeleted}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_deleted: totalDeleted,
        users_processed: results.length,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
