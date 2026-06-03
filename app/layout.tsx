import { ClerkProvider } from '@clerk/nextjs';
import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "@liveblocks/react-ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js Premium Startup Boilerplate",
  description: "Created using the ultimate interactive Next.js stack generator CLI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning={true}>
          {(() => {
            const { userId } = auth();
            return (
              <header className="w-full p-3 border-b flex justify-end bg-gray-50">
                {userId ? <UserButton /> : <SignInButton />}
              </header>
            );
          })()}

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
