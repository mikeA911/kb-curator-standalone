import { useParams } from 'react-router-dom'
import ChunkReviewer from '../components/curator/ChunkReviewer'

export default function ReviewPage() {
  const { docId } = useParams<{ docId: string }>()

  if (!docId) {
    return <div>Invalid Document ID</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ChunkReviewer documentId={docId} />
    </div>
  )
}
