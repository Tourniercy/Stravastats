import { auth } from "@/auth"

export default auth((req) => {
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
  if (!isOnDashboard) return Response.json({})
  
  const isLoggedIn = !!req.auth
  if (!isLoggedIn) {
    return Response.redirect(new URL('/', req.url))
  }
})

// Specify paths that need authentication
export const config = {
  matcher: ['/dashboard/:path*']
}
