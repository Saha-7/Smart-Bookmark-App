'use client'

import { useEffect, useState } from 'react'
import { createClient } from './lib/supabase'

export default function Home() {
  // Create supabase client once inside the component
  const supabase = createClient()

  // State variables — these hold your app's data
  const [user, setUser] = useState(null)         // logged-in user (or null if not logged in)
  const [bookmarks, setBookmarks] = useState([]) // list of bookmarks from database
  const [title, setTitle] = useState('')         // form input: bookmark title
  const [url, setUrl] = useState('')             // form input: bookmark url
  const [loading, setLoading] = useState(true)   // shows loading state on first load

  // ─── AUTH: Check if user is already logged in ────────────────────────────
  useEffect(() => {
    // Get current session on page load
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Listen for login/logout events in real time
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Cleanup listener when component unmounts
    return () => listener.subscription.unsubscribe()
  }, [])

  // ─── DATA: Load bookmarks & subscribe to real-time changes ───────────────
  useEffect(() => {
    // If user logs out, clear bookmarks
    if (!user) {
      setBookmarks([])
      return
    }

    // Fetch bookmarks from database
    fetchBookmarks()

    // Subscribe to real-time updates for this user's bookmarks
    // This fires whenever ANY change happens (insert/delete) in the bookmarks table
    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',                    // listen to all events (INSERT, DELETE, UPDATE)
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}` // only this user's bookmarks
        },
        () => {
          // Re-fetch bookmarks whenever something changes
          fetchBookmarks()
        }
      )
      .subscribe()

    // Cleanup subscription when user logs out or component unmounts
    return () => supabase.removeChannel(channel)
  }, [user]) // re-run this whenever user changes

  // ─── FUNCTIONS ───────────────────────────────────────────────────────────

  // Fetch all bookmarks for the logged-in user
  async function fetchBookmarks() {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false }) // newest first

    if (error) {
      console.error('Error fetching bookmarks:', error.message)
      return
    }
    setBookmarks(data ?? [])
  }

  // Sign in with Google (redirects to Google login page)
  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin // send them back to your app after login
      }
    })
  }

  // Sign out
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  // Add a new bookmark
  async function handleAddBookmark(e) {
    e.preventDefault() // prevent page refresh on form submit

    if (!title.trim() || !url.trim()) return // don't submit empty fields

    const { error } = await supabase
      .from('bookmarks')
      .insert({
        title: title.trim(),
        url: url.trim(),
        user_id: user.id // link bookmark to the logged-in user
      })

    if (error) {
      console.error('Error adding bookmark:', error.message)
      return
    }

    // Clear the form inputs after successful add
    setTitle('')
    setUrl('')
    // No need to manually fetch — real-time subscription will trigger fetchBookmarks()
  }

  // Delete a bookmark by its id
  async function handleDelete(id) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id) // only delete the row with this specific id

    if (error) {
      console.error('Error deleting bookmark:', error.message)
    }
    // No need to manually fetch — real-time subscription will trigger fetchBookmarks()
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  // Show loading spinner on first load
  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg">Loading...</p>
      </main>
    )
  }

  // Show login screen if user is not logged in
  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-md">
          {/* App icon */}
          <div className="text-6xl mb-6">🔖</div>

          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Smart Bookmarks
          </h1>
          <p className="text-gray-500 mb-8 text-lg">
            Save, organize, and access your bookmarks from anywhere. Updates instantly across all your tabs.
          </p>

          <button
            onClick={handleLogin}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
          >
            Sign in with Google
          </button>

          <p className="text-gray-400 text-sm mt-4">
            No password needed — just your Google account.
          </p>
        </div>
      </main>
    )
  }

  // Show main app if user is logged in
  return (
    <main className="max-w-2xl mx-auto p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔖</span>
          <h1 className="text-2xl font-bold text-gray-800">My Bookmarks</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Add Bookmark Form */}
      <form
        onSubmit={handleAddBookmark}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
      >
        <h2 className="font-semibold text-gray-700 mb-4">Add New Bookmark</h2>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title  (e.g. Google)"
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL  (e.g. https://google.com)"
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors self-start"
          >
            + Add Bookmark
          </button>
        </div>
      </form>

      {/* Bookmarks List */}
      <div>
        <p className="text-sm text-gray-400 mb-3">
          {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} saved
          <span className="ml-2 text-green-400 text-xs">● Live</span>
        </p>

        <div className="space-y-3">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-start gap-4 hover:shadow-md transition-shadow"
            >
              {/* Bookmark info */}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate">{bookmark.title}</p>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 text-sm hover:underline truncate block"
                >
                  {bookmark.url}
                </a>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(bookmark.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(bookmark.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-xl leading-none"
                title="Delete bookmark"
              >
                ×
              </button>
            </div>
          ))}

          {/* Empty state */}
          {bookmarks.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg font-medium">No bookmarks yet</p>
              <p className="text-sm mt-1">Add your first bookmark above!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}