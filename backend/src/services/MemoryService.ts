/**
 * Memory MCP Client Service
 * Connects Executive Assistant to the Unified Memory RAG system
 * for conversation context and historical knowledge retrieval.
 */

export interface MemorySearchResult {
  id: string;
  title: string;
  url: string;
  score?: number;
}

export interface MemoryChunk {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata: {
    thread_id?: string;
    ts_start?: string;
    ts_end?: string;
    token_count?: number;
  };
}

export interface MemorySearchResponse {
  results: MemorySearchResult[];
  query: string;
  timestamp: string;
}

// Intelligence Layer Types
export interface MemoryStats {
  chunks: number;
  memories: number;
  entities: number;
  beliefs: number;
  timestamp: string;
}

export interface ProactiveSuggestion {
  type: 'entity_context' | 'temporal_pattern' | 'forgotten_relevant' | 'chain_continuation' | 'belief_update';
  trigger: string;
  relevance: number;
  entity?: string;
  related_memories?: string[];
  memories?: Array<{ id: string; snippet: string; importance?: number }>;
  updates?: Array<{ subject: string; old: string; new: string }>;
}

export interface SuggestionsResponse {
  suggestions: ProactiveSuggestion[];
  mentioned_entities: string[];
  enabled: boolean;
  timestamp: string;
  error?: string;
}

export interface ExecutiveBrief {
  id: string;
  period: string;
  scope: string;
  summary: string;
  highlights: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  notable_entities: string[];
  created_at: string;
}

export interface BriefResponse {
  brief: ExecutiveBrief | null;
  generated: boolean;
  message?: string;
  error?: string;
}

export interface Entity {
  id: string;
  type: 'person' | 'project' | 'technology' | 'concept' | 'organization';
  name: string;
  properties?: Record<string, any>;
  mention_count?: number;
  first_seen?: string;
  last_seen?: string;
}

export interface EntityDetail extends Entity {
  observations: Array<{
    id: string;
    content: string;
    confidence: number;
    source: string;
    timestamp: string;
  }>;
  relations: Array<{
    id: string;
    from_id: string;
    to_id: string;
    relation_type: string;
  }>;
}

export interface Belief {
  id: string;
  fact: string;
  subject: string;
  category: 'preference' | 'fact' | 'belief' | 'decision';
  confidence: number;
  established: string;
  superseded_by?: string;
}

export interface Contradiction {
  subject: string;
  old_belief: { id: string; fact: string; date: string };
  new_belief: { id: string; fact: string; date: string };
}

export interface StoreMemoryResult {
  stored: boolean;
  memory_id: string | null;
  entities_created: Array<{ id: string; name: string; type: string }>;
  beliefs_created: Array<{ id: string; fact: string; subject: string; category: string }>;
  error?: string;
}

export class MemoryService {
  private baseUrl: string;
  private enabled: boolean;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.MEMORY_MCP_URL || 'http://localhost:8000';
    this.enabled = true;
  }

  /**
   * Search conversation memory using hybrid semantic + lexical search
   */
  async search(query: string, limit: number = 8): Promise<MemorySearchResponse> {
    if (!this.enabled) {
      return { results: [], query, timestamp: new Date().toISOString() };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
      });

      if (!response.ok) {
        console.warn(`[MemoryService] Search failed: ${response.status}`);
        return { results: [], query, timestamp: new Date().toISOString() };
      }

      const data = await response.json() as { results?: MemorySearchResult[] };

      return {
        results: data.results || [],
        query,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('[MemoryService] Search error:', error);
      return { results: [], query, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Fetch full chunk content by ID
   */
  async fetch(chunkId: string): Promise<MemoryChunk | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chunk/${chunkId}`);

      if (!response.ok) {
        console.warn(`[MemoryService] Fetch failed: ${response.status}`);
        return null;
      }

      return await response.json() as MemoryChunk;
    } catch (error) {
      console.warn('[MemoryService] Fetch error:', error);
      return null;
    }
  }

  /**
   * Search and fetch full content for top results
   */
  async searchWithContent(query: string, limit: number = 3): Promise<MemoryChunk[]> {
    const searchResults = await this.search(query, limit);

    const chunks: MemoryChunk[] = [];
    for (const result of searchResults.results.slice(0, limit)) {
      const chunk = await this.fetch(result.id);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Get memory context formatted for LLM consumption
   */
  async getContextForQuery(query: string, maxTokens: number = 2000): Promise<string> {
    const chunks = await this.searchWithContent(query, 5);

    if (chunks.length === 0) {
      return '';
    }

    let context = '## Relevant Memory Context\n\n';
    let tokenEstimate = 50; // Header overhead

    for (const chunk of chunks) {
      const chunkText = `### ${chunk.title}\n${chunk.text}\n\n`;
      const chunkTokens = Math.ceil(chunkText.length / 4); // Rough estimate

      if (tokenEstimate + chunkTokens > maxTokens) {
        break;
      }

      context += chunkText;
      tokenEstimate += chunkTokens;
    }

    return context;
  }

  /**
   * Check if memory service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Enable/disable the memory service
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ============================================================
  // Intelligence Layer Methods
  // ============================================================

  /**
   * Get memory system statistics
   */
  async getStats(): Promise<MemoryStats | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/stats`);
      if (!response.ok) return null;
      return await response.json() as MemoryStats;
    } catch (error) {
      console.warn('[MemoryService] Stats error:', error);
      return null;
    }
  }

  /**
   * Get proactive memory suggestions based on current context
   * Used to surface relevant memories before the user asks
   */
  async getProactiveSuggestions(
    context: string,
    mentionedEntities: string[] = [],
    recentAccessed: string[] = []
  ): Promise<SuggestionsResponse> {
    if (!this.enabled) {
      return {
        suggestions: [],
        mentioned_entities: [],
        enabled: false,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          mentioned_entities: mentionedEntities,
          recent_accessed: recentAccessed,
        }),
      });

      if (!response.ok) {
        console.warn(`[MemoryService] Suggestions failed: ${response.status}`);
        return {
          suggestions: [],
          mentioned_entities: [],
          enabled: true,
          timestamp: new Date().toISOString(),
        };
      }

      return await response.json() as SuggestionsResponse;
    } catch (error) {
      console.warn('[MemoryService] Suggestions error:', error);
      return {
        suggestions: [],
        mentioned_entities: [],
        enabled: true,
        timestamp: new Date().toISOString(),
        error: String(error),
      };
    }
  }

  /**
   * Generate an executive brief summarizing recent activity
   * Answers questions like "Brief me on X" or "What decisions about Y?"
   */
  async generateBrief(focus: string = 'general business strategy', timeRangeDays: number = 30): Promise<BriefResponse> {
    if (!this.enabled) {
      return { brief: null, generated: false, error: 'Memory service disabled' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus,
          time_range_days: timeRangeDays,
        }),
      });

      if (!response.ok) {
        return { brief: null, generated: false, error: `Request failed: ${response.status}` };
      }

      return await response.json() as BriefResponse;
    } catch (error) {
      console.warn('[MemoryService] Brief generation error:', error);
      return { brief: null, generated: false, error: String(error) };
    }
  }

  /**
   * Get list of recent executive briefs
   */
  async getBriefs(limit: number = 5): Promise<ExecutiveBrief[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/briefs?limit=${limit}`);
      if (!response.ok) return [];
      const data = await response.json() as { briefs?: ExecutiveBrief[] };
      return data.briefs || [];
    } catch (error) {
      console.warn('[MemoryService] Get briefs error:', error);
      return [];
    }
  }

  /**
   * Store a new memory from chat interaction
   * Automatically extracts entities and beliefs
   */
  async storeMemory(
    content: string,
    options: {
      tags?: string[];
      importance?: number;
      source?: string;
      extractEntities?: boolean;
      extractBeliefs?: boolean;
    } = {}
  ): Promise<StoreMemoryResult> {
    if (!this.enabled) {
      return {
        stored: false,
        memory_id: null,
        entities_created: [],
        beliefs_created: [],
        error: 'Memory service disabled',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          tags: options.tags || [],
          importance: options.importance ?? 0.5,
          source: options.source || 'chat',
          extract_entities: options.extractEntities ?? true,
          extract_beliefs: options.extractBeliefs ?? true,
        }),
      });

      if (!response.ok) {
        return {
          stored: false,
          memory_id: null,
          entities_created: [],
          beliefs_created: [],
          error: `Request failed: ${response.status}`,
        };
      }

      return await response.json() as StoreMemoryResult;
    } catch (error) {
      console.warn('[MemoryService] Store memory error:', error);
      return {
        stored: false,
        memory_id: null,
        entities_created: [],
        beliefs_created: [],
        error: String(error),
      };
    }
  }

  /**
   * Query entities from the knowledge graph
   * Returns people, projects, technologies, concepts, organizations
   */
  async getEntities(
    query?: string,
    entityType?: string,
    limit: number = 20
  ): Promise<Entity[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || null,
          entity_type: entityType || null,
          limit,
        }),
      });

      if (!response.ok) return [];
      const data = await response.json() as { entities?: Entity[] };
      return data.entities || [];
    } catch (error) {
      console.warn('[MemoryService] Get entities error:', error);
      return [];
    }
  }

  /**
   * Get detailed entity information including observations and relations
   */
  async getEntityDetail(entityId: string): Promise<EntityDetail | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/entity/${entityId}`);
      if (!response.ok) return null;
      const data = await response.json() as { entity: Entity; observations?: EntityDetail['observations']; relations?: EntityDetail['relations'] };
      return {
        ...data.entity,
        observations: data.observations || [],
        relations: data.relations || [],
      };
    } catch (error) {
      console.warn('[MemoryService] Get entity detail error:', error);
      return null;
    }
  }

  /**
   * Query semantic beliefs (preferences, facts, decisions)
   * Used to surface "You usually prefer..." context
   */
  async getBeliefs(
    subject?: string,
    category?: string,
    includeSuperseded: boolean = false
  ): Promise<Belief[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/beliefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject || null,
          category: category || null,
          include_superseded: includeSuperseded,
        }),
      });

      if (!response.ok) return [];
      const data = await response.json() as { beliefs?: Belief[] };
      return data.beliefs || [];
    } catch (error) {
      console.warn('[MemoryService] Get beliefs error:', error);
      return [];
    }
  }

  /**
   * Get belief contradictions
   * Used for "You said X before, now saying Y" alerts
   */
  async getContradictions(): Promise<Contradiction[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/contradictions`);
      if (!response.ok) return [];
      const data = await response.json() as { contradictions?: Contradiction[] };
      return data.contradictions || [];
    } catch (error) {
      console.warn('[MemoryService] Get contradictions error:', error);
      return [];
    }
  }

  /**
   * Get comprehensive memory context for a query
   * Combines search results with proactive suggestions and relevant beliefs
   */
  async getEnrichedContext(
    query: string,
    options: {
      maxTokens?: number;
      includeBeliefs?: boolean;
      includeSuggestions?: boolean;
    } = {}
  ): Promise<{
    searchContext: string;
    suggestions: ProactiveSuggestion[];
    beliefs: Belief[];
    entities: string[];
  }> {
    const { maxTokens = 2000, includeBeliefs = true, includeSuggestions = true } = options;

    // Run searches in parallel
    const [searchContext, suggestionsResponse, beliefs] = await Promise.all([
      this.getContextForQuery(query, maxTokens),
      includeSuggestions ? this.getProactiveSuggestions(query) : Promise.resolve({ suggestions: [], mentioned_entities: [], enabled: false, timestamp: '' }),
      includeBeliefs ? this.getBeliefs() : Promise.resolve([]),
    ]);

    return {
      searchContext,
      suggestions: suggestionsResponse.suggestions,
      beliefs: beliefs.slice(0, 5), // Top 5 recent beliefs
      entities: suggestionsResponse.mentioned_entities,
    };
  }
}

// Singleton instance
let memoryService: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!memoryService) {
    memoryService = new MemoryService();
  }
  return memoryService;
}

export default MemoryService;
