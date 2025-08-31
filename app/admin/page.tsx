'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Draft {
  slug: string
  title: string
  authors: string[]
  status: string
  createdAt: string
  updatedAt: string
  isConflict: boolean
  excerpt: string
  feedback?: string
}

export default function AdminDashboard() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({})
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const username = localStorage.getItem('admin_username')
    const password = localStorage.getItem('admin_password')
    
    if (!username || !password) {
      router.push('/admin/login')
      return
    }
    
    fetchDrafts()
  }, [router])

  const fetchDrafts = async () => {
    try {
      setLoading(true)
      const username = localStorage.getItem('admin_username')
      const password = localStorage.getItem('admin_password')
      
      if (!username || !password) {
        router.push('/admin/login')
        return
      }

      const response = await fetch('/api/admin/drafts', {
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid credentials and redirect to login
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_password')
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to fetch drafts')
      }

      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (slug: string, action: 'approve' | 'reject') => {
    try {
      setProcessing(slug)
      
      const username = localStorage.getItem('admin_username')
      const password = localStorage.getItem('admin_password')
      
      if (!username || !password) {
        router.push('/admin/login')
        return
      }
      
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        },
        body: JSON.stringify({
          slug,
          action,
          feedback: feedback[slug] || ''
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid credentials and redirect to login
          localStorage.removeItem('admin_username')
          localStorage.removeItem('admin_password')
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to process action')
      }

      const result = await response.json()
      
      if (result.success) {
        // Remove the draft from the list
        setDrafts(prev => prev.filter(d => d.slug !== slug))
        setFeedback(prev => {
          const newFeedback = { ...prev }
          delete newFeedback[slug]
          return newFeedback
        })
        
        alert(action === 'approve' ? 'Post approved and published!' : 'Post rejected!')
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to process action'}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_username')
    localStorage.removeItem('admin_password')
    router.push('/admin/login')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading drafts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDrafts}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Review and approve draft posts ({drafts.length} pending)
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {drafts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No drafts to review</h3>
            <p className="text-gray-600">All posts have been reviewed or there are no pending drafts.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {drafts.map((draft) => (
              <div key={draft.slug} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{draft.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(draft.status)}`}>
                        {draft.status}
                      </span>
                      {draft.isConflict && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Conflict
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      By {draft.authors.join(', ')} • Created {formatDate(draft.createdAt)}
                    </p>
                    
                    <p className="text-gray-700 mb-4">{draft.excerpt}</p>
                    
                    {draft.status === 'rejected' && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <strong>Rejected:</strong> {draft.feedback || 'No feedback provided'}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleAction(draft.slug, 'approve')}
                        disabled={processing === draft.slug}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === draft.slug ? 'Processing...' : 'Approve'}
                      </button>
                      
                      <button
                        onClick={() => handleAction(draft.slug, 'reject')}
                        disabled={processing === draft.slug}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {processing === draft.slug ? 'Processing...' : 'Reject'}
                      </button>
                      
                      <input
                        type="text"
                        placeholder="Rejection feedback (optional)"
                        value={feedback[draft.slug] || ''}
                        onChange={(e) => setFeedback(prev => ({ ...prev, [draft.slug]: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
