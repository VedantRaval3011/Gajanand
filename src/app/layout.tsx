import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Gajanand",
  description: "This is a finance software",
  icons: {
    icon: "/ganpati.ico", // Use .ico format for best compatibility
    apple: {
      url: "/ganpati.jpg", // A PNG is better for Apple devices
      sizes: "180x180",
      type: "image/png",
    },
    shortcut: "/ganpati.jpg", // For home screen shortcuts
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body className={`${ubuntu.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}