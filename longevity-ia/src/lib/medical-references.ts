/**
 * Medical References Search — PubMed, Semantic Scholar, OpenAlex
 * Searches for verified scientific references for protocol interventions.
 * Used exclusively for medico role to provide DOI-backed citations.
 */

export interface VerifiedReference {
  title: string
  authors: string          // "Smith J, Doe A, et al."
  journal: string
  year: number
  doi: string | null
  pmid: string | null
  url: string
  source: 'pubmed' | 'semantic_scholar' | 'openalex'
  citationCount?: number
}

export interface ProtocolReferences {
  molecule: string
  references: VerifiedReference[]
}

// ── PubMed E-utilities ──────────────────────────────────────────

const PUBMED_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
const PUBMED_SUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'

async function searchPubMed(query: string, maxResults = 3): Promise<VerifiedReference[]> {
  try {
    // Search for PMIDs
    const searchUrl = `${PUBMED_SEARCH}?db=pubmed&retmode=json&retmax=${maxResults}&sort=relevance&term=${encodeURIComponent(query)}`
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const ids: string[] = searchData?.esearchresult?.idlist ?? []
    if (ids.length === 0) return []

    // Fetch summaries
    const summaryUrl = `${PUBMED_SUMMARY}?db=pubmed&retmode=json&id=${ids.join(',')}`
    const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(8000) })
    if (!summaryRes.ok) return []

    const summaryData = await summaryRes.json()
    const results: VerifiedReference[] = []

    for (const id of ids) {
      const article = summaryData?.result?.[id]
      if (!article || article.error) continue

      const authors = (article.authors ?? [])
        .slice(0, 3)
        .map((a: { name: string }) => a.name)
        .join(', ')
      const authorStr = (article.authors ?? []).length > 3 ? `${authors}, et al.` : authors

      const doi = (article.articleids ?? []).find((a: { idtype: string; value: string }) => a.idtype === 'doi')?.value ?? null

      results.push({
        title: article.title ?? '',
        authors: authorStr,
        journal: article.fulljournalname ?? article.source ?? '',
        year: parseInt(article.pubdate?.split(' ')[0]) || 0,
        doi,
        pmid: id,
        url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source: 'pubmed',
      })
    }

    return results
  } catch {
    return []
  }
}

// ── Semantic Scholar API ────────────────────────────────────────

const SEMANTIC_SEARCH = 'https://api.semanticscholar.org/graph/v1/paper/search'

async function searchSemanticScholar(query: string, maxResults = 2): Promise<VerifiedReference[]> {
  try {
    const url = `${SEMANTIC_SEARCH}?query=${encodeURIComponent(query)}&limit=${maxResults}&fields=title,authors,journal,year,externalIds,citationCount,url`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []

    const data = await res.json()
    const papers = data?.data ?? []

    return papers.map((p: {
      title: string
      authors: { name: string }[]
      journal?: { name: string }
      year: number
      externalIds?: { DOI?: string; PubMed?: string }
      citationCount?: number
      url?: string
    }) => {
      const authorNames = (p.authors ?? []).slice(0, 3).map((a) => a.name).join(', ')
      const authorStr = (p.authors ?? []).length > 3 ? `${authorNames}, et al.` : authorNames
      const doi = p.externalIds?.DOI ?? null

      return {
        title: p.title ?? '',
        authors: authorStr,
        journal: p.journal?.name ?? '',
        year: p.year ?? 0,
        doi,
        pmid: p.externalIds?.PubMed ?? null,
        url: doi ? `https://doi.org/${doi}` : p.url ?? '',
        source: 'semantic_scholar' as const,
        citationCount: p.citationCount,
      }
    })
  } catch {
    return []
  }
}

// ── OpenAlex API ────────────────────────────────────────────────

const OPENALEX_SEARCH = 'https://api.openalex.org/works'

async function searchOpenAlex(query: string, maxResults = 2): Promise<VerifiedReference[]> {
  try {
    const url = `${OPENALEX_SEARCH}?search=${encodeURIComponent(query)}&per_page=${maxResults}&select=title,authorships,primary_location,publication_year,doi,ids,cited_by_count`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'LongevityIA/1.0 (mailto:support@longevityia.com)' },
    })
    if (!res.ok) return []

    const data = await res.json()
    const works = data?.results ?? []

    return works.map((w: {
      title: string
      authorships: { author: { display_name: string } }[]
      primary_location?: { source?: { display_name: string } }
      publication_year: number
      doi?: string
      ids?: { pmid?: string }
      cited_by_count?: number
    }) => {
      const authorNames = (w.authorships ?? []).slice(0, 3).map((a) => a.author.display_name).join(', ')
      const authorStr = (w.authorships ?? []).length > 3 ? `${authorNames}, et al.` : authorNames
      const doi = w.doi?.replace('https://doi.org/', '') ?? null

      return {
        title: w.title ?? '',
        authors: authorStr,
        journal: w.primary_location?.source?.display_name ?? '',
        year: w.publication_year ?? 0,
        doi,
        pmid: w.ids?.pmid?.replace('https://pubmed.ncbi.nlm.nih.gov/', '') ?? null,
        url: w.doi ?? '',
        source: 'openalex' as const,
        citationCount: w.cited_by_count,
      }
    })
  } catch {
    return []
  }
}

// ── Búsqueda combinada y deduplicación ──────────────────────────

function deduplicateRefs(refs: VerifiedReference[]): VerifiedReference[] {
  const seen = new Set<string>()
  return refs.filter((r) => {
    // Deduplicate by DOI or by title similarity
    const key = r.doi ?? r.title.toLowerCase().slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildQuery(molecule: string, evidence: string): string {
  // Extract key terms: molecule name + main keywords from evidence
  const cleanMolecule = molecule.replace(/[()]/g, '').trim()
  // Take first author or key term from evidence
  const evidenceTerms = evidence
    .replace(/[()[\]]/g, '')
    .split(/[,;:]/)
    .slice(0, 2)
    .join(' ')
    .trim()

  return `${cleanMolecule} ${evidenceTerms}`.slice(0, 200)
}

/**
 * Search all 3 APIs in parallel for a single protocol item.
 * Returns deduplicated, sorted references (most cited first).
 */
export async function searchReferencesForItem(
  molecule: string,
  evidence: string
): Promise<VerifiedReference[]> {
  const query = buildQuery(molecule, evidence)

  const [pubmed, semantic, openalex] = await Promise.all([
    searchPubMed(query, 3),
    searchSemanticScholar(query, 2),
    searchOpenAlex(query, 2),
  ])

  const all = deduplicateRefs([...pubmed, ...semantic, ...openalex])

  // Sort: PubMed first (most authoritative), then by citation count
  return all.sort((a, b) => {
    if (a.source === 'pubmed' && b.source !== 'pubmed') return -1
    if (b.source === 'pubmed' && a.source !== 'pubmed') return 1
    return (b.citationCount ?? 0) - (a.citationCount ?? 0)
  }).slice(0, 5) // Max 5 references per item
}

/**
 * Search references for all protocol items in parallel (batched).
 * Limits concurrency to avoid rate limiting.
 */
export async function searchReferencesForProtocol(
  protocol: { molecule: string; evidence: string }[]
): Promise<ProtocolReferences[]> {
  // Process in batches of 3 to respect API rate limits
  const BATCH_SIZE = 3
  const results: ProtocolReferences[] = []

  for (let i = 0; i < protocol.length; i += BATCH_SIZE) {
    const batch = protocol.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (item) => ({
        molecule: item.molecule,
        references: await searchReferencesForItem(item.molecule, item.evidence),
      }))
    )
    results.push(...batchResults)
  }

  return results
}
