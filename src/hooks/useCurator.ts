import { useState, useEffect, useCallback } from 'react'
import type {
  Document,
  DocumentStats,
  ChunkForReview,
} from '../types'
import {
  getDocumentStats,
  getChunksForReview,
  getDocument,
} from '../lib/api/curator'

export function useCurator(documentId: string | null) {
  const [document, setDocument] = useState<Document | null>(null)
  const [chunks, setChunks] = useState<ChunkForReview[]>([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    filtered: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      setDocument(null)
      setChunks([])
      setStats({ total: 0, approved: 0, rejected: 0, pending: 0, filtered: 0 })
      return
    }

    async function loadData() {
      if (!documentId) return
      
      setLoading(true)
      setError(null)

      try {
        const [docData, chunksData, statsData] = await Promise.all([
          getDocument(documentId),
          getChunksForReview(documentId),
          getDocumentStats(documentId),
        ])

        setDocument(docData)
        setChunks(chunksData)
        setStats(statsData)
        setCurrentChunkIndex(0)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data'
        setError(message)
        console.error('useCurator load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [documentId])

  const refreshChunks = useCallback(async () => {
    if (!documentId) return

    try {
      const [chunksData, statsData] = await Promise.all([
        getChunksForReview(documentId),
        getDocumentStats(documentId),
      ])

      setChunks(chunksData)
      setStats(statsData)

      if (currentChunkIndex >= chunksData.length) {
        setCurrentChunkIndex(Math.max(0, chunksData.length - 1))
      }
    } catch (err) {
      console.error('Failed to refresh chunks:', err)
    }
  }, [documentId, currentChunkIndex])

  const nextChunk = useCallback(() => {
    if (currentChunkIndex < chunks.length - 1) {
      setCurrentChunkIndex((prev) => prev + 1)
    }
  }, [currentChunkIndex, chunks.length])

  const previousChunk = useCallback(() => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex((prev) => prev - 1)
    }
  }, [currentChunkIndex])

  const goToChunk = useCallback(
    (index: number) => {
      if (index >= 0 && index < chunks.length) {
        setCurrentChunkIndex(index)
      }
    },
    [chunks.length]
  )

  const currentChunk = chunks[currentChunkIndex] || null
  const progress = stats.total > 0 ? (stats.approved + stats.rejected) / stats.total : 0

  return {
    document,
    chunks,
    currentChunk,
    currentChunkIndex,
    stats,
    loading,
    error,
    progress,
    nextChunk,
    previousChunk,
    goToChunk,
    refreshChunks,
    hasNext: currentChunkIndex < chunks.length - 1,
    hasPrevious: currentChunkIndex > 0,
    isComplete: stats.pending === 0 && stats.total > 0,
    isEmpty: chunks.length === 0,
  }
}
