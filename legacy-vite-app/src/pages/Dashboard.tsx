import { useNavigate } from 'react-router-dom'
import CuratorDashboard from '../components/curator/CuratorDashboard'
import type { CurationQueueItem } from '../types'

export default function DashboardPage() {
  const navigate = useNavigate()

  const handleSelectQueueItem = (item: CurationQueueItem) => {
    const params = new URLSearchParams({
      kb: item.kb_id,
      sourceUrl: item.url
    })
    navigate(`/upload?${params.toString()}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CuratorDashboard onSelectQueueItem={handleSelectQueueItem} />
    </div>
  )
}
