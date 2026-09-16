export const metadata = {
  title: 'PEAR - Speed Dating App',
  description: 'Find your perfect pair',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'Inter, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
