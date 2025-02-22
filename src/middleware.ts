import { auth } from "@/auth"

export default auth((req) => {
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
  if (!isOnDashboard) return null
})

// Specify paths that need authentication
export const config = {
  matcher: ['/dashboard/:path*']
}
