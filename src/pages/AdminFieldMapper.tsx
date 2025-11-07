import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, Upload, Sparkles, FileText, Eye, Scan } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatabaseFieldsList } from "@/components/field-mapper/DatabaseFieldsList";
import { PdfFieldsList } from "@/components/field-mapper/PdfFieldsList";
import { MappingsList } from "@/components/field-mapper/MappingsList";
import { MappingStats } from "@/components/field-mapper/MappingStats";
import { AutoMapDialog } from "@/components/field-mapper/AutoMapDialog";

const DOCUMENT_TYPES = [
  { value: "geburtsurkunde", label: "Geburtsurkunde" },
  { value: "eltern_dokument_vater", label: "Ausweis Vater" },
  { value: "eltern_dokument_mutter", label: "Ausweis Mutter" },
  { value: "meldebescheinigung_mutter", label: "Meldebescheinigung Mutter" },
  { value: "meldebescheinigung_vater", label: "Meldebescheinigung Vater" },
  { value: "bankverbindung", label: "Bankverbindung" },
];

export default function AdminFieldMapper() {
  const navigate = useNavigate();
  const [documentType, setDocumentType] = useState("geburtsurkunde");
  const [databaseSchema, setDatabaseSchema] = useState<any[]>([]);
  const [pdfFields, setPdfFields] = useState<string[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoMapDialogOpen, setAutoMapDialogOpen] = useState(false);
  const [fieldCoordinates, setFieldCoordinates] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    loadDatabaseSchema();
  }, []);

  useEffect(() => {
    if (documentType) {
      loadMappings();
    }
  }, [documentType]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
    }
  };

  const loadDatabaseSchema = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-database-schema');
      if (error) throw error;
      setDatabaseSchema(data.schema || []);
    } catch (error: any) {
      console.error('Error loading schema:', error);
      toast.error('Failed to load database schema');
    }
  };

  const loadMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-field-mappings', {
        body: { document_type: documentType }
      });
      if (error) throw error;
      setMappings(data.mappings || []);
    } catch (error: any) {
      console.error('Error loading mappings:', error);
      toast.error('Failed to load mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMap = async () => {
    setAutoMapDialogOpen(true);
  };

  const handleLoadPdfFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-pdf-fields', {
        body: { pdf_template_path: 'elterngeldantrag_bis_Maerz25.pdf' }
      });
      if (error) throw error;
      setPdfFields(data.fields || []);
      toast.success(`Loaded ${data.fields.length} PDF fields`);
    } catch (error: any) {
      console.error('Error loading PDF fields:', error);
      toast.error('Failed to load PDF fields');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePdfLayout = async () => {
    if (!documentType) {
      toast.error("Please select a document type first");
      return;
    }

    setLoading(true);
    try {
      toast.info("Analyzing PDF layout and extracting field coordinates...");
      
      const { data, error } = await supabase.functions.invoke('analyze-pdf-layout', {
        body: { pdf_template_path: 'elterngeldantrag_bis_Maerz25.pdf' }
      });

      if (error) throw error;

      console.log('PDF Layout Analysis:', data);
      
      // Extract unique field names from coordinates
      const uniqueFields = [...new Set(data.field_coordinates.map((fc: any) => fc.name))] as string[];
      setPdfFields(uniqueFields);
      setFieldCoordinates(data.field_coordinates);
      
      toast.success(
        `Analyzed ${data.total_pages} pages with ${data.total_fields} field instances (${uniqueFields.length} unique fields)`,
        { duration: 5000 }
      );
      
      console.log('Field coordinates ready for vision analysis:', data.field_coordinates);
      
    } catch (error: any) {
      console.error('Error analyzing PDF layout:', error);
      toast.error('Failed to analyze PDF layout');
    } finally {
      setLoading(false);
    }
  };

  const handleVisionMapFields = async () => {
    if (!documentType || fieldCoordinates.length === 0) {
      toast.error("Please run PDF layout analysis first");
      return;
    }

    setLoading(true);
    try {
      toast.info("Starting AI vision analysis of PDF fields...", { duration: 3000 });
      
      const pdfPath = 'elterngeldantrag_bis_Maerz25.pdf';
      
      // Get page metadata from the layout analysis results
      const pageMetadata = Array.from(
        new Set(fieldCoordinates.map((fc: any) => fc.page))
      ).map((pageNum: number) => ({ page: pageNum }));

      const { data, error } = await supabase.functions.invoke('vision-map-fields', {
        body: { 
          field_coordinates: fieldCoordinates,
          pdf_path: pdfPath,
          page_metadata: pageMetadata
        }
      });

      if (error) throw error;

      console.log('Vision Analysis Results:', data);

      // Create mappings from vision analysis with validation
      const visionMappings = data.analyses
        .filter((analysis: any) => analysis.confidence >= 40)
        .map((analysis: any) => {
          // Try to match to database fields based on semantic meaning
          let matchedTable = '';
          let matchedField = '';
          
          // Enhanced matching logic with exact match priority
          for (const table of databaseSchema) {
            for (const column of table.columns) {
              const semanticLower = analysis.semantic_meaning.toLowerCase();
              const columnLower = column.name.toLowerCase();
              
              // Exact match first (highest priority)
              if (columnLower === semanticLower) {
                matchedTable = table.table_name;
                matchedField = column.name;
                break;
              }
              
              // Partial match as fallback
              if (semanticLower.includes(columnLower) || columnLower.includes(semanticLower.split(' ')[0])) {
                matchedTable = table.table_name;
                matchedField = column.name;
                break;
              }
            }
            if (matchedField) break;
          }

          return {
            document_type: documentType,
            source_table: matchedTable || 'unknown',
            source_field: matchedField || 'unknown',
            pdf_field_name: analysis.field_name,
            confidence_score: analysis.confidence,
            mapping_status: matchedField ? 'vision' : 'needs_review',
            is_active: !!matchedField,
            notes: `Visual Label: ${analysis.visual_label}\nSemantic: ${analysis.semantic_meaning}`
          };
        });

      // Filter out invalid mappings before saving
      const validMappings = visionMappings.filter(m => m.source_field !== 'unknown');
      const invalidMappings = visionMappings.filter(m => m.source_field === 'unknown');

      setMappings(validMappings);
      
      // Show warning about unmapped fields
      if (invalidMappings.length > 0) {
        toast.warning(
          `${invalidMappings.length} fields could not be auto-mapped and need manual review.`,
          { duration: 5000 }
        );
        console.log('Unmapped fields requiring manual review:', invalidMappings);
      }
      
      toast.success(
        `Vision analysis complete: ${data.total_analyzed} fields analyzed, ${visionMappings.length} high-confidence matches found`,
        { duration: 6000 }
      );
      
    } catch (error: any) {
      console.error('Error in vision mapping:', error);
      toast.error('Failed to perform vision analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapping = (source: { table: string; field: string }, pdfField: string) => {
    // Check if mapping already exists
    const exists = mappings.some(
      m => m.source_table === source.table && 
           m.source_field === source.field && 
           m.pdf_field_name === pdfField
    );
    
    if (exists) {
      toast.error('This mapping already exists');
      return;
    }

    const newMapping = {
      document_type: documentType,
      source_table: source.table,
      source_field: source.field,
      pdf_field_name: pdfField,
      confidence_score: 0,
      mapping_status: 'manual',
      is_active: true,
      notes: null
    };
    
    setMappings([...mappings, newMapping]);
    toast.success(`Mapped ${source.field} → ${pdfField}`);
  };

  const handleSaveMappings = async () => {
    // Validate mappings before saving
    const invalidMappings = mappings.filter(m => 
      pdfFields.length > 0 && !pdfFields.includes(m.pdf_field_name)
    );
    
    if (invalidMappings.length > 0) {
      toast.error(`${invalidMappings.length} mappings reference non-existent PDF fields. Please fix before saving.`);
      console.error('Invalid mappings:', invalidMappings);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('save-field-mappings', {
        body: { mappings }
      });
      if (error) throw error;
      toast.success('Mappings saved successfully');
      loadMappings(); // Reload to get server-generated data
    } catch (error: any) {
      console.error('Error saving mappings:', error);
      toast.error('Failed to save mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllMappings = async () => {
    if (!confirm(`Are you sure you want to clear all mappings for ${documentType}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      // Delete all mappings for this document type
      const { error } = await supabase
        .from('pdf_field_mappings')
        .delete()
        .eq('document_type', documentType);
      
      if (error) throw error;
      setMappings([]);
      toast.success('All mappings cleared');
    } catch (error: any) {
      console.error('Error clearing mappings:', error);
      toast.error('Failed to clear mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMappings = () => {
    const dataStr = JSON.stringify(mappings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `field-mappings-${documentType}.json`;
    link.click();
    toast.success('Mappings exported');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Field Mapping Manager</h1>
              <p className="text-muted-foreground">Map database fields to PDF AcroForm fields</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportMappings}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handleLoadPdfFields}>
              <FileText className="h-4 w-4 mr-2" />
              Load PDF Fields
            </Button>
            <Button variant="secondary" onClick={handleAnalyzePdfLayout}>
              <Eye className="h-4 w-4 mr-2" />
              Extract Layout
            </Button>
            <Button 
              variant="default" 
              onClick={handleVisionMapFields}
              disabled={loading || fieldCoordinates.length === 0}
            >
              <Scan className="h-4 w-4 mr-2" />
              Vision AI Mapping
            </Button>
            <Button variant="outline" onClick={handleAutoMap}>
              <Sparkles className="h-4 w-4 mr-2" />
              Auto-Map
            </Button>
            <Button onClick={handleSaveMappings} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
          </div>
        </div>

        {/* Quick Start Help Card */}
        <Card className="p-4 mb-6 bg-muted/50 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Quick Start Guide</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Select a document type below</li>
                <li>Click "Load PDF Fields" to see all available PDF form fields (657 fields)</li>
                <li>Drag database fields from the left panel onto PDF fields in the right panel</li>
                <li>Review your mappings in the table below</li>
                <li>Click "Save All" to store mappings in the database</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Tip: All PDF form filling now uses database-stored mappings. No code changes needed for new mappings!
              </p>
            </div>
          </div>
        </Card>

        {/* Document Type Selector */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="font-medium">Document Type:</label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mappings.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleClearAllMappings}
                disabled={loading}
              >
                Clear All Mappings
              </Button>
            )}
          </div>
        </Card>

        {/* Stats */}
        <MappingStats mappings={mappings} />

        {/* Main Mapping Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DatabaseFieldsList 
            schema={databaseSchema}
            mappings={mappings}
          />
          <PdfFieldsList 
            fields={pdfFields}
            mappings={mappings}
            onCreateMapping={handleCreateMapping}
          />
        </div>

        {/* Mappings List */}
        <MappingsList 
          mappings={mappings}
          onUpdate={setMappings}
          pdfFields={pdfFields}
        />
      </div>

      <AutoMapDialog
        open={autoMapDialogOpen}
        onOpenChange={setAutoMapDialogOpen}
        documentType={documentType}
        databaseSchema={databaseSchema}
        onMappingsGenerated={(newMappings, allPdfFields) => {
          setMappings(newMappings);
          setPdfFields(allPdfFields || []);
        }}
      />
    </div>
  );
}