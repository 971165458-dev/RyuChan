import { ArrowUpDown } from 'lucide-react'
import { useAuthStore } from '@/components/write/hooks/use-auth'

export default function ArticleOrderLink() {
  const { isAuth } = useAuthStore()
  if (!isAuth) return null
  return <div className="flex justify-end"><a href="/blog/archives?sort=1" className="btn btn-sm btn-primary gap-2 rounded-xl"><ArrowUpDown className="h-4 w-4" />排序文章</a></div>
}
