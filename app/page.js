'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from './lib/supabase'

export default function Home() {
  const supabase = createClient()

  const [user, setUser] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchBookmarks = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('Error fetching bookmarks:', error.message); return }
    setBookmarks(data ?? [])
  }, [supabase])

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Clear bookmarks when user logs out
  useEffect(() => {
    if (!user) setBookmarks([])
  }, [user])

  // Fetch + real-time subscription when user logs in
  useEffect(() => {
    if (!user) return

    fetchBookmarks()

    const channel = supabase
      .channel('bookmarks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${user.id}` }, () => fetchBookmarks())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookmarks' }, (payload) => {
        setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, fetchBookmarks])

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleAddBookmark(e) {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    const { error } = await supabase.from('bookmarks').insert({ title: title.trim(), url: url.trim(), user_id: user.id })
    if (error) { console.error('Error adding bookmark:', error.message); return }
    setTitle('')
    setUrl('')
  }

  async function handleDelete(id) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)
    if (error) { console.error('Error deleting bookmark:', error.message); fetchBookmarks() }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-400 text-lg">Loading...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔖</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Smart Bookmarks</h1>
          <p className="text-gray-500 mb-8 text-lg">
            Save, organize, and access your bookmarks from anywhere. Updates instantly across all your tabs.
          </p>
          <button
            onClick={handleLogin}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors shadow-md cursor-pointer border-none"
          >
            Sign in with Google
          </button>
          <p className="text-gray-400 text-sm mt-4">No password needed — just your Google account.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:px-6">

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔖</span>
          <h1 className="text-2xl font-bold text-gray-800 m-0">My Bookmarks</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{user.user_metadata?.full_name || user.email}</span>
          <button onClick={handleLogout} className="text-sm text-white font-medium bg-red-500 border-none cursor-pointer px-3 py-1 rounded-lg">
            Logout
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4 mt-0">Add New Bookmark</h2>
        <form onSubmit={handleAddBookmark}>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Google)"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (e.g. https://google.com)"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors self-start border-none cursor-pointer"
            >
              + Add Bookmark
            </button>
          </div>
        </form>
      </div>

      <div>
        <p className="text-sm text-gray-400 mb-3">
          {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
          <span className="ml-2 text-green-400 text-xs">● Live</span>
        </p>

        <div className="flex flex-col gap-3">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-start gap-4 hover:shadow-md transition-shadow">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate m-0 mb-1">{bookmark.title}</p>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline truncate block">
                  {bookmark.url}
                </a>
                <p className="text-xs text-gray-400 mt-1 mb-0">{new Date(bookmark.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleDelete(bookmark.id)}
                title="Delete bookmark"
                className="text-gray-300 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer text-xl leading-none flex-shrink-0"
              >
                🗑️
              </button>
            </div>
          ))}

          {bookmarks.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-medium">No bookmarks yet</p>
              <p className="text-sm mt-1">Add your first bookmark above!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}















