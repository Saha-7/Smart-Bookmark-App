import './globals.css'

export const metadata = {
  title: 'Smart Bookmarks',
  description: 'Your personal bookmark manager',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}