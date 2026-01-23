import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  Node, 
  Edge 
} from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Play,
  Plus,
  FileJson,
  RefreshCw
} from 'lucide-react';

import { NodePalette } from '@/components/logic-designer/NodePalette';
import { LogicCanvas } from '@/components/logic-designer/LogicCanvas';
import { NodePropertiesPanel } from '@/components/logic-designer/NodePropertiesPanel';

interface FlowDefinition {
  nodes: Node[];
  edges: Edge[];
  variables: string[];
}

interface ComputedFieldRule {
  id: string;
  name: string;
  description: string | null;
  page_number: number | null;
  flow_definition: FlowDefinition;
  is_active: boolean;
  execution_order: number;
}

const TABLES = [
  'geburtsurkunden',
  'eltern_dokumente',
  'arbeitgeberbescheinigungen',
  'gehaltsnachweise',
  'steuerbescheide',
  'meldebescheinigungen',
  'bankverbindungen',
  'krankenversicherungen',
  'leistungsbescheide',
  'mutterschaftsgeld_bescheide',
  'selbststaendigen_nachweise',
  'adoptions_pflege_dokumente',
  'ehe_sorgerecht_dokumente',
  'aerztliche_zeugnisse',
  'schwerbehindertenausweise',
  'vaterschaftsanerkennungen',
  'kindergeld_bescheide',
];

export default function AdminLogicDesigner() {
  const navigate = useNavigate();
  
  // Rule management state
  const [rules, setRules] = useState<ComputedFieldRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [rulePageNumber, setRulePageNumber] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  // Reference data
  const [pdfFields, setPdfFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load rules on mount
  useEffect(() => {
    loadRules();
    loadPdfFields();
  }, []);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('computed_field_rules')
      .select('*')
      .order('execution_order');
    
    if (error) {
      console.error('Error loading rules:', error);
      toast.error('Fehler beim Laden der Regeln');
      return;
    }
    
    // Cast to proper type - flow_definition is stored as JSONB
    const typedRules = (data || []).map(rule => ({
      ...rule,
      flow_definition: rule.flow_definition as unknown as FlowDefinition
    }));
    
    setRules(typedRules);
  };

  const loadPdfFields = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-elterngeld-form', {
        body: {}
      });
      
      if (error) throw error;
      
      if (data?.fields) {
        setPdfFields(data.fields.map((f: any) => f.name).sort());
      }
    } catch (err) {
      console.error('Error loading PDF fields:', err);
    }
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateNodeData = useCallback((nodeId: string, newData: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
    // Update selected node as well
    setSelectedNode((prev) => prev?.id === nodeId ? { ...prev, data: newData } : prev);
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const selectRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    setSelectedRuleId(ruleId);
    setRuleName(rule.name);
    setRuleDescription(rule.description || '');
    setRulePageNumber(rule.page_number);
    setIsActive(rule.is_active);
    setNodes(rule.flow_definition.nodes || []);
    setEdges(rule.flow_definition.edges || []);
    setSelectedNode(null);
  };

  const createNewRule = () => {
    setSelectedRuleId(null);
    setRuleName('Neue Regel');
    setRuleDescription('');
    setRulePageNumber(1);
    setIsActive(true);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };

  const saveRule = async () => {
    if (!ruleName.trim()) {
      toast.error('Bitte einen Namen eingeben');
      return;
    }

    setLoading(true);
    
    const flowDefinition: FlowDefinition = {
      nodes,
      edges,
      variables: extractVariables(nodes),
    };

    try {
      if (selectedRuleId) {
        // Update existing
        const { error } = await supabase
          .from('computed_field_rules')
          .update({
            name: ruleName,
            description: ruleDescription || null,
            page_number: rulePageNumber,
            flow_definition: flowDefinition as any,
            is_active: isActive,
          })
          .eq('id', selectedRuleId);
        
        if (error) throw error;
        toast.success('Regel aktualisiert');
      } else {
        // Create new
        const { data, error } = await supabase
          .from('computed_field_rules')
          .insert({
            name: ruleName,
            description: ruleDescription || null,
            page_number: rulePageNumber,
            flow_definition: flowDefinition as any,
            is_active: isActive,
            execution_order: rules.length,
          })
          .select()
          .single();
        
        if (error) throw error;
        setSelectedRuleId(data.id);
        toast.success('Regel erstellt');
      }
      
      await loadRules();
    } catch (err) {
      console.error('Error saving rule:', err);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async () => {
    if (!selectedRuleId) return;
    
    if (!confirm('Regel wirklich löschen?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('computed_field_rules')
        .delete()
        .eq('id', selectedRuleId);
      
      if (error) throw error;
      
      createNewRule();
      await loadRules();
      toast.success('Regel gelöscht');
    } catch (err) {
      console.error('Error deleting rule:', err);
      toast.error('Fehler beim Löschen');
    } finally {
      setLoading(false);
    }
  };

  const exportRule = () => {
    const flowDefinition: FlowDefinition = {
      nodes,
      edges,
      variables: extractVariables(nodes),
    };
    
    const exportData = {
      name: ruleName,
      description: ruleDescription,
      page_number: rulePageNumber,
      flow_definition: flowDefinition,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logic-rule-${ruleName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Regel exportiert');
  };

  const importRule = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        setRuleName(data.name || 'Importierte Regel');
        setRuleDescription(data.description || '');
        setRulePageNumber(data.page_number || 1);
        setNodes(data.flow_definition?.nodes || []);
        setEdges(data.flow_definition?.edges || []);
        setSelectedRuleId(null);
        setSelectedNode(null);
        
        toast.success('Regel importiert');
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Fehler beim Importieren');
      }
    };
    input.click();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-setup')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Visual Logic Designer</h1>
            <p className="text-sm text-muted-foreground">
              Erstelle komplexe Mapping-Logik per Drag & Drop
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={importRule}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={exportRule} disabled={nodes.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            size="sm" 
            onClick={saveRule} 
            disabled={loading || !ruleName.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Rule List + Node Palette */}
        <div className="w-64 flex flex-col border-r bg-muted/20">
          {/* Rule selector */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Regeln</Label>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createNewRule}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Select value={selectedRuleId || ''} onValueChange={selectRule}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Regel auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    <span className={rule.is_active ? '' : 'text-muted-foreground line-through'}>
                      {rule.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Rule metadata */}
          <div className="p-4 border-b space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input 
                value={ruleName} 
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Regelname"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Beschreibung</Label>
              <Textarea 
                value={ruleDescription} 
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Optional..."
                className="text-sm h-16 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Seite</Label>
                <Input 
                  type="number" 
                  value={rulePageNumber || ''} 
                  onChange={(e) => setRulePageNumber(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="1"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsActive(!isActive)}
                  className="h-8"
                >
                  {isActive ? 'Aktiv' : 'Inaktiv'}
                </Button>
              </div>
            </div>
            {selectedRuleId && (
              <Button variant="destructive" size="sm" className="w-full" onClick={deleteRule}>
                <Trash2 className="w-4 h-4 mr-2" />
                Regel löschen
              </Button>
            )}
          </div>
          
          {/* Node palette */}
          <div className="flex-1 overflow-y-auto">
            <NodePalette />
          </div>
        </div>

        {/* Center: Canvas */}
        <LogicCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodesUpdate={setNodes}
          onEdgesUpdate={setEdges}
        />

        {/* Right: Properties */}
        <NodePropertiesPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onDelete={deleteNode}
          onClose={() => setSelectedNode(null)}
          tables={TABLES}
          pdfFields={pdfFields}
        />
      </div>
    </div>
  );
}

function extractVariables(nodes: Node[]): string[] {
  const vars = new Set<string>();
  
  for (const node of nodes) {
    const data = node.data as any;
    if (data.output) vars.add(data.output);
    if (data.name) vars.add(data.name);
    if (data.itemVariable) vars.add(data.itemVariable);
    if (data.indexVariable) vars.add(data.indexVariable);
  }
  
  return Array.from(vars);
}
