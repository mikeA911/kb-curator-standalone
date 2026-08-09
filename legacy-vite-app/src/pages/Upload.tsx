import { useSearchParams } from 'react-router-dom'
import DocumentUploader from '../components/curator/DocumentUploader'

export default function UploadPage() {
  const [searchParams] = useSearchParams()
  const kb = searchParams.get('kb') || undefined
  const sourceUrl = searchParams.get('sourceUrl') || undefined

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DocumentUploader initialDocType={kb} initialSourceUrl={sourceUrl} />
    </div>
  )
}
