import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { typeDefs } from '@/graphql/schema'
import { resolvers } from '@/graphql/resolvers'
import type { GraphQLContext } from '@/graphql/context'
import { NextRequest } from 'next/server'

const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
})

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  server,
  {
    context: async (req) => {
      // Extract user info from headers set by middleware
      const userId = req.headers.get('x-user-id')
      const userEmail = req.headers.get('x-user-email')
      const userRole = req.headers.get('x-user-role')

      const user =
        userId && userEmail && userRole
          ? {
              id: userId,
              email: userEmail,
              name: userEmail.split('@')[0],
              role: userRole as 'ADMIN' | 'EMPLOYEE' | 'USER',
              emailVerified: true, // GraphQL requests come through authenticated middleware
            }
          : null

      return {
        user,
        userId: userId || undefined,
        userEmail: userEmail || undefined,
        userRole: userRole || undefined,
      }
    },
  }
)

export async function GET(request: NextRequest) {
  return handler(request)
}

export async function POST(request: NextRequest) {
  return handler(request)
}
