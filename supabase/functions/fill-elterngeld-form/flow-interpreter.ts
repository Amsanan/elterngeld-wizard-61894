// Flow Interpreter for computed_field_rules
// Executes visual logic flows from the Logic Designer

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==========================================
// TYPES
// ==========================================

interface FilterCondition {
  column: string;
  operator: string;
  value: string;
  value2?: string;
  columnType?: string;
}

interface NodeData {
  // DataSource node
  table?: string;
  columns?: string[];
  filterConditions?: FilterCondition[];
  filterLogic?: 'AND' | 'OR';
  output?: string;
  
  // Count node
  countOutput?: string;
  
  // Aggregate node
  aggregateFunction?: string;
  column?: string;
  groupBy?: string;
  having?: string;
  
  // Condition node
  field?: string;
  operator?: string;
  value?: string | number | boolean;
  
  // SetField node
  pdfField?: string;
  autoFormat?: boolean;
  
  // Variable node
  name?: string;
  
  // Transform node
  operation?: string;
  inputVariable?: string;
  outputVariable?: string;
  format?: string;
  separator?: string;
  template?: string;
  compareVariable?: string;
  compareFields?: string;
  
  // Loop node
  sourceVariable?: string;
  itemVariable?: string;
  indexVariable?: string;
}

interface FlowNode {
  id: string;
  type: string;
  data: NodeData;
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
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

export interface FlowResult {
  fieldValues: Record<string, string | boolean>;
  warnings: string[];
  executedRules: string[];
}

// ==========================================
// EXECUTION CONTEXT
// ==========================================

class ExecutionContext {
  variables: Map<string, any> = new Map();
  fieldValues: Record<string, string | boolean> = {};
  warnings: string[] = [];
  
  setVariable(name: string, value: any) {
    this.variables.set(name, value);
    console.log(`  [Context] Set variable ${name} =`, value);
  }
  
  getVariable(name: string): any {
    return this.variables.get(name);
  }
  
  resolveValue(value: string | undefined): any {
    if (!value) return value;
    if (typeof value !== 'string') return value;
    
    // Check for variable reference {{varName}}
    const varMatch = value.match(/^\{\{(\w+)\}\}$/);
    if (varMatch) {
      return this.getVariable(varMatch[1]);
    }
    
    // Replace embedded variables
    return value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      const val = this.getVariable(varName);
      return val !== undefined ? String(val) : '';
    });
  }
  
  setFieldValue(pdfField: string, value: string | boolean) {
    this.fieldValues[pdfField] = value;
    console.log(`  [Context] Set PDF field ${pdfField} =`, value);
  }
}

// ==========================================
// NODE EXECUTORS
// ==========================================

async function executeDataSourceNode(
  node: FlowNode,
  ctx: ExecutionContext,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { table, columns, filterConditions, filterLogic, output } = node.data;
  
  if (!table) {
    ctx.warnings.push(`DataSource node ${node.id}: No table specified`);
    return;
  }
  
  console.log(`  [DataSource] Querying ${table}`);
  
  // Build query
  let query = supabase.from(table).select(columns?.length ? columns.join(',') : '*');
  
  // Add user_id filter
  query = query.eq('user_id', userId);
  
  // Apply filter conditions
  if (filterConditions && filterConditions.length > 0) {
    for (const cond of filterConditions) {
      query = applyFilterCondition(query, cond);
    }
  }
  
  const { data, error } = await query;
  
  if (error) {
    ctx.warnings.push(`DataSource ${node.id}: Query error - ${error.message}`);
    return;
  }
  
  if (output) {
    ctx.setVariable(output, data || []);
  }
}

async function executeCountNode(
  node: FlowNode,
  ctx: ExecutionContext,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { table, filterConditions, countOutput } = node.data;
  
  if (!table) {
    ctx.warnings.push(`Count node ${node.id}: No table specified`);
    return;
  }
  
  console.log(`  [Count] Counting ${table}`);
  
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  query = query.eq('user_id', userId);
  
  if (filterConditions && filterConditions.length > 0) {
    for (const cond of filterConditions) {
      query = applyFilterCondition(query, cond);
    }
  }
  
  const { count, error } = await query;
  
  if (error) {
    ctx.warnings.push(`Count ${node.id}: Query error - ${error.message}`);
    return;
  }
  
  if (countOutput) {
    ctx.setVariable(countOutput, count || 0);
  }
}

async function executeAggregateNode(
  node: FlowNode,
  ctx: ExecutionContext,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { aggregateFunction, table, column, groupBy, having, output, filterConditions } = node.data;
  
  if (!table || !aggregateFunction) {
    ctx.warnings.push(`Aggregate node ${node.id}: Missing table or function`);
    return;
  }
  
  console.log(`  [Aggregate] ${aggregateFunction}(${column || '*'}) FROM ${table}`);
  
  // For aggregate operations, we need to fetch data and compute in JS
  // since Supabase JS client doesn't support GROUP BY/HAVING directly
  
  let query = supabase.from(table).select('*');
  query = query.eq('user_id', userId);
  
  if (filterConditions && filterConditions.length > 0) {
    for (const cond of filterConditions) {
      query = applyFilterCondition(query, cond);
    }
  }
  
  const { data, error } = await query;
  
  if (error) {
    ctx.warnings.push(`Aggregate ${node.id}: Query error - ${error.message}`);
    return;
  }
  
  if (!data || data.length === 0) {
    if (output) ctx.setVariable(output, 0);
    return;
  }
  
  let result: any;
  
  // Handle GROUP BY
  if (groupBy) {
    // Group data by the specified column
    const groups: Map<any, any[]> = new Map();
    for (const row of data) {
      const key = row[groupBy];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }
    
    // Apply aggregate function to each group
    const groupResults: { key: any; value: number }[] = [];
    
    for (const [key, rows] of groups) {
      let groupValue: number;
      
      switch (aggregateFunction) {
        case 'count':
          groupValue = rows.length;
          break;
        case 'countDistinct':
          const uniqueValues = new Set(rows.map(r => column ? r[column] : r));
          groupValue = uniqueValues.size;
          break;
        case 'sum':
          groupValue = rows.reduce((acc, r) => acc + (Number(r[column!]) || 0), 0);
          break;
        case 'avg':
          groupValue = rows.reduce((acc, r) => acc + (Number(r[column!]) || 0), 0) / rows.length;
          break;
        case 'min':
          groupValue = Math.min(...rows.map(r => Number(r[column!]) || Infinity));
          break;
        case 'max':
          groupValue = Math.max(...rows.map(r => Number(r[column!]) || -Infinity));
          break;
        default:
          groupValue = rows.length;
      }
      
      groupResults.push({ key, value: groupValue });
    }
    
    // Apply HAVING filter
    let filteredResults = groupResults;
    if (having) {
      const havingMatch = having.match(/([<>=!]+)\s*(\d+)/);
      if (havingMatch) {
        const [_, op, threshold] = havingMatch;
        const thresholdNum = Number(threshold);
        
        filteredResults = groupResults.filter(g => {
          switch (op) {
            case '>': return g.value > thresholdNum;
            case '>=': return g.value >= thresholdNum;
            case '<': return g.value < thresholdNum;
            case '<=': return g.value <= thresholdNum;
            case '=': case '==': return g.value === thresholdNum;
            case '!=': case '<>': return g.value !== thresholdNum;
            default: return true;
          }
        });
      }
    }
    
    // For Mehrlinge counting: return the count value (e.g., 2 for twins)
    if (filteredResults.length > 0) {
      result = filteredResults[0].value;
    } else {
      result = 0;
    }
  } else {
    // No GROUP BY - simple aggregate over all data
    switch (aggregateFunction) {
      case 'count':
        result = data.length;
        break;
      case 'countDistinct':
        const uniqueValues = new Set(data.map(r => column ? r[column] : r));
        result = uniqueValues.size;
        break;
      case 'sum':
        result = data.reduce((acc, r) => acc + (Number(r[column!]) || 0), 0);
        break;
      case 'avg':
        result = data.reduce((acc, r) => acc + (Number(r[column!]) || 0), 0) / data.length;
        break;
      case 'min':
        result = Math.min(...data.map(r => Number(r[column!]) || Infinity));
        break;
      case 'max':
        result = Math.max(...data.map(r => Number(r[column!]) || -Infinity));
        break;
      default:
        result = data.length;
    }
  }
  
  console.log(`  [Aggregate] Result: ${result}`);
  
  if (output) {
    ctx.setVariable(output, result);
  }
}

function executeConditionNode(
  node: FlowNode,
  ctx: ExecutionContext
): boolean {
  const { field, operator, value } = node.data;
  
  if (!field || !operator) {
    return false;
  }
  
  const fieldValue = ctx.resolveValue(`{{${field}}}`);
  const compareValue = ctx.resolveValue(String(value));
  
  console.log(`  [Condition] ${field} (${fieldValue}) ${operator} ${compareValue}`);
  
  switch (operator) {
    case '==':
    case '=':
      return fieldValue == compareValue;
    case '!=':
    case '<>':
      return fieldValue != compareValue;
    case '>':
      return Number(fieldValue) > Number(compareValue);
    case '>=':
      return Number(fieldValue) >= Number(compareValue);
    case '<':
      return Number(fieldValue) < Number(compareValue);
    case '<=':
      return Number(fieldValue) <= Number(compareValue);
    case 'contains':
      return String(fieldValue).includes(String(compareValue));
    case 'startsWith':
      return String(fieldValue).startsWith(String(compareValue));
    case 'endsWith':
      return String(fieldValue).endsWith(String(compareValue));
    case 'isEmpty':
      return !fieldValue || fieldValue === '' || fieldValue === null;
    case 'isNotEmpty':
      return !!fieldValue && fieldValue !== '';
    default:
      return false;
  }
}

function executeSetFieldNode(
  node: FlowNode,
  ctx: ExecutionContext
): void {
  const { pdfField, value, autoFormat } = node.data;
  
  if (!pdfField) {
    ctx.warnings.push(`SetField node ${node.id}: No PDF field specified`);
    return;
  }
  
  let resolvedValue = ctx.resolveValue(String(value || ''));
  
  // Auto-format dates
  if (autoFormat && resolvedValue) {
    const dateMatch = String(resolvedValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [_, year, month, day] = dateMatch;
      resolvedValue = `${day}.${month}.${year}`;
    }
  }
  
  // Handle checkbox fields (cb. prefix)
  if (pdfField.startsWith('cb.')) {
    const boolValue = resolvedValue === 'true' || resolvedValue === '1' || 
                      resolvedValue === true || Number(resolvedValue) > 0;
    ctx.setFieldValue(pdfField, boolValue);
  } else {
    ctx.setFieldValue(pdfField, resolvedValue !== undefined ? String(resolvedValue) : '');
  }
}

function executeVariableNode(
  node: FlowNode,
  ctx: ExecutionContext
): void {
  const { name, value } = node.data;
  
  if (!name) {
    ctx.warnings.push(`Variable node ${node.id}: No variable name specified`);
    return;
  }
  
  const resolvedValue = ctx.resolveValue(String(value || ''));
  ctx.setVariable(name, resolvedValue);
}

function executeTransformNode(
  node: FlowNode,
  ctx: ExecutionContext
): void {
  const { operation, inputVariable, outputVariable, format, separator } = node.data;
  
  if (!inputVariable || !outputVariable) {
    return;
  }
  
  const inputValue = ctx.getVariable(inputVariable);
  let result: any;
  
  switch (operation) {
    case 'formatDate':
      if (inputValue) {
        const dateMatch = String(inputValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [_, year, month, day] = dateMatch;
          result = format === 'DD.MM.YYYY' ? `${day}.${month}.${year}` : `${day}.${month}.${year}`;
        } else {
          result = inputValue;
        }
      }
      break;
    case 'concat':
      if (Array.isArray(inputValue)) {
        result = inputValue.join(separator || ', ');
      } else {
        result = String(inputValue);
      }
      break;
    case 'uppercase':
      result = String(inputValue).toUpperCase();
      break;
    case 'lowercase':
      result = String(inputValue).toLowerCase();
      break;
    case 'trim':
      result = String(inputValue).trim();
      break;
    case 'toString':
      result = String(inputValue);
      break;
    case 'toNumber':
      result = Number(inputValue);
      break;
    case 'first':
      result = Array.isArray(inputValue) ? inputValue[0] : inputValue;
      break;
    case 'last':
      result = Array.isArray(inputValue) ? inputValue[inputValue.length - 1] : inputValue;
      break;
    case 'length':
      result = Array.isArray(inputValue) ? inputValue.length : String(inputValue).length;
      break;
    case 'coalesce':
      result = inputValue ?? '';
      break;
    case 'compareObjects': {
      // Compares two objects on specified fields
      // Usage: inputVariable = first object, compareVariable = second object
      // compareFields = comma-separated list of fields to compare
      const obj1 = inputValue;
      const obj2 = ctx.getVariable(node.data.compareVariable || '');
      const fieldsToCompare = (node.data.compareFields || '').split(',').map((f: string) => f.trim()).filter(Boolean);
      
      console.log(`  [Transform] compareObjects:`, { obj1, obj2, fieldsToCompare });
      
      if (!obj1 && !obj2) {
        // Both empty = equal (no data)
        result = true;
      } else if (!obj1 || !obj2) {
        // Only one present = living together (single parent scenario)
        result = true;
      } else if (fieldsToCompare.length === 0) {
        // No fields specified = compare entire objects
        result = JSON.stringify(obj1) === JSON.stringify(obj2);
      } else {
        // Compare only specified fields
        result = fieldsToCompare.every((field: string) => {
          const val1 = obj1[field];
          const val2 = obj2[field];
          // Normalize: treat null/undefined/empty string as equal
          const norm1 = val1 === null || val1 === undefined ? '' : String(val1).trim().toLowerCase();
          const norm2 = val2 === null || val2 === undefined ? '' : String(val2).trim().toLowerCase();
          return norm1 === norm2;
        });
      }
      break;
    }
    default:
      result = inputValue;
  }
  
  ctx.setVariable(outputVariable, result);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function applyFilterCondition(query: any, cond: FilterCondition): any {
  const { column, operator, value, value2 } = cond;
  
  switch (operator) {
    case '=':
    case 'eq':
      return query.eq(column, value);
    case '!=':
    case 'neq':
      return query.neq(column, value);
    case '>':
    case 'gt':
      return query.gt(column, value);
    case '>=':
    case 'gte':
      return query.gte(column, value);
    case '<':
    case 'lt':
      return query.lt(column, value);
    case '<=':
    case 'lte':
      return query.lte(column, value);
    case 'like':
    case 'LIKE':
      return query.like(column, value);
    case 'ilike':
    case 'ILIKE':
      return query.ilike(column, value);
    case 'is':
      return query.is(column, value === 'null' ? null : value);
    case 'in':
      return query.in(column, value.split(',').map((v: string) => v.trim()));
    default:
      return query.eq(column, value);
  }
}

function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  
  // Build graph
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }
  
  // Kahn's algorithm
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }
  
  const sorted: FlowNode[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      sorted.push(node);
    }
    
    for (const target of (adjacency.get(nodeId) || [])) {
      const newDegree = (inDegree.get(target) || 1) - 1;
      inDegree.set(target, newDegree);
      if (newDegree === 0) {
        queue.push(target);
      }
    }
  }
  
  return sorted;
}

// ==========================================
// MAIN INTERPRETER
// ==========================================

export async function executeComputedFieldRules(
  supabase: SupabaseClient,
  userId: string
): Promise<FlowResult> {
  const result: FlowResult = {
    fieldValues: {},
    warnings: [],
    executedRules: []
  };
  
  console.log('=== EXECUTING COMPUTED FIELD RULES ===');
  
  // Load active rules
  const { data: rules, error } = await supabase
    .from('computed_field_rules')
    .select('*')
    .eq('is_active', true)
    .order('execution_order');
  
  if (error) {
    console.error('Error loading computed_field_rules:', error);
    result.warnings.push(`Failed to load rules: ${error.message}`);
    return result;
  }
  
  if (!rules || rules.length === 0) {
    console.log('No active computed field rules found');
    return result;
  }
  
  console.log(`Found ${rules.length} active rules`);
  
  // Execute each rule
  for (const rule of rules as ComputedFieldRule[]) {
    console.log(`\n--- Executing rule: ${rule.name} ---`);
    
    try {
      const ctx = new ExecutionContext();
      const flow = rule.flow_definition;
      
      if (!flow || !flow.nodes || flow.nodes.length === 0) {
        console.log('  No nodes in flow, skipping');
        continue;
      }
      
      // Sort nodes topologically
      const sortedNodes = topologicalSort(flow.nodes, flow.edges || []);
      console.log(`  Executing ${sortedNodes.length} nodes in order`);
      
      // Execute nodes in order
      for (const node of sortedNodes) {
        console.log(`  Node: ${node.type} (${node.id})`);
        
        switch (node.type) {
          case 'dataSource':
            await executeDataSourceNode(node, ctx, supabase, userId);
            break;
          case 'count':
            await executeCountNode(node, ctx, supabase, userId);
            break;
          case 'aggregate':
            await executeAggregateNode(node, ctx, supabase, userId);
            break;
          case 'condition':
            executeConditionNode(node, ctx);
            break;
          case 'setField':
            executeSetFieldNode(node, ctx);
            break;
          case 'variable':
            executeVariableNode(node, ctx);
            break;
          case 'transform':
            executeTransformNode(node, ctx);
            break;
          case 'loop':
            // Loop execution would need special handling
            console.log('  Loop nodes not yet fully implemented');
            break;
          default:
            console.log(`  Unknown node type: ${node.type}`);
        }
      }
      
      // Merge field values from this rule
      Object.assign(result.fieldValues, ctx.fieldValues);
      result.warnings.push(...ctx.warnings);
      result.executedRules.push(rule.name);
      
      console.log(`  Rule ${rule.name} completed, set ${Object.keys(ctx.fieldValues).length} fields`);
      
    } catch (ruleError) {
      const msg = ruleError instanceof Error ? ruleError.message : 'Unknown error';
      console.error(`  Rule ${rule.name} failed:`, msg);
      result.warnings.push(`Rule "${rule.name}" failed: ${msg}`);
    }
  }
  
  console.log('=== COMPUTED FIELD RULES COMPLETE ===');
  console.log(`Total fields set: ${Object.keys(result.fieldValues).length}`);
  console.log(`Rules executed: ${result.executedRules.join(', ')}`);
  
  return result;
}
