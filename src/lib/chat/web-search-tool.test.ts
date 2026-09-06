import { describe, it, expect, vi, beforeEach } from 'vitest'

const tavilyApiKeyMock = vi.fn()
vi.mock('@/lib/env', () => ({ env: { tavilyApiKey: () => tavilyApiKeyMock() } }))

const { runSearchWeb } = await import('./web-search-tool')

const fetchMock = vi.fn()

beforeEach(() => {
  tavilyApiKeyMock.mockReset()
  tavilyApiKeyMock.mockReturnValue('fake-tavily-key')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('runSearchWeb', () => {
  it('maps a successful Tavily response into WebSearchHit results', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: 'Acme Corp — About', url: 'https://acme.example/about', content: 'Acme makes widgets.', score: 0.92, published_date: '2026-08-01' },
        ],
        answer: null,
      }),
    })

    const result = await runSearchWeb({ query: 'Acme Corp' })

    expect(result.results).toEqual([
      { title: 'Acme Corp — About', url: 'https://acme.example/about', content: 'Acme makes widgets.', score: 0.92, publishedDate: '2026-08-01' },
    ])
    expect(result.answer).toBeNull()
  })

  it('applies input defaults and omits timeRange from the request body when not provided', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })

    await runSearchWeb({ query: 'Acme Corp' })

    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(requestInit.body)
    expect(body).toMatchObject({ query: 'Acme Corp', search_depth: 'basic', topic: 'general', max_results: 5 })
    expect(body).not.toHaveProperty('time_range')
  })

  it('throws with the status code when Tavily returns a non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid api key' })

    await expect(runSearchWeb({ query: 'Acme Corp' })).rejects.toThrow(/401/)
  })

  it('throws without calling fetch when TAVILY_API_KEY is unset', async () => {
    tavilyApiKeyMock.mockReturnValue(undefined)

    await expect(runSearchWeb({ query: 'Acme Corp' })).rejects.toThrow(/not configured/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
