import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"

export const { auth: edgeAuth } = NextAuth({
  providers: [
    Resend({
      from: process.env.AUTH_FROM_EMAIL ?? "onboarding@resend.dev",
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
})
