import "./globals.css"
import { Providers } from "@/components/providers"

console.log("Layout is rendering")

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log("Inside RootLayout function")
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 