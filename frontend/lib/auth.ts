import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { query, getPool } from "@/lib/db";
import { verifyManualAccount } from "@/lib/userAccounts";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both your email and password.");
        }
        const res = await verifyManualAccount({
          email: credentials.email,
          password: credentials.password,
        });
        if (!res.ok) {
          throw new Error(res.error);
        }
        return {
          id: String(res.user.id),
          email: res.user.email,
          name: res.user.name || res.user.email.split("@")[0],
          image: res.user.image || null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      if (account?.provider === "credentials") return true;

      try {
        // Automatically initialize database tables if they don't exist
        // (runs the migration once per server process, not on every sign-in)
        await getPool();

        // Check if user exists in the database
        const { rows } = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [user.email]);
        
        if (rows.length === 0) {
          // Create new user in PostgreSQL
          await query(
            "INSERT INTO users (email, name, image, auth_provider) VALUES ($1, $2, $3, 'google')",
            [user.email.toLowerCase(), user.name || null, user.image || null]
          );
          console.log(`Successfully created user: ${user.email} in PostgreSQL`);
        } else {
          // If profile image or name changed/updated, we can sync it
          await query(
            "UPDATE users SET name = COALESCE($1, name), image = COALESCE($2, image) WHERE LOWER(email) = LOWER($3)",
            [user.name || null, user.image || null, user.email]
          );
        }
        return true;
      } catch (err: any) {
        console.error("Error during NextAuth signIn callback:", err.message);
        // Return true to allow fallback mode even if DB connection fails
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;

        // Fetch user database ID to attach to session
        try {
          const { rows } = await query("SELECT id, age, bmi FROM users WHERE LOWER(email) = LOWER($1)", [token.email]);
          if (rows.length > 0) {
            (session as any).user.id = rows[0].id;
            (session as any).user.age = rows[0].age;
            (session as any).user.bmi = rows[0].bmi;
          } else {
            // Fallback for mock mode if user wasn't stored
            (session as any).user.id = 999;
          }
        } catch (err) {
          (session as any).user.id = 999;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  // Never fall back to a known secret in production: anyone could forge session
  // tokens with it. Without NEXTAUTH_SECRET, NextAuth refuses to run in production.
  secret:
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "sakhi-dev-only-insecure-secret" : undefined),
};
