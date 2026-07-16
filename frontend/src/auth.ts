import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();

        if (res.ok && data.user) {
          // Return user and the backend token to be saved in JWT
          return { ...data.user, token: data.token };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = (user as any).token;
        token.id = user.id;
        token.isPlatformAdmin = (user as any).isPlatformAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).backendToken = token.backendToken;
        session.user.id = token.id as string;
        (session.user as any).isPlatformAdmin = token.isPlatformAdmin;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
});
