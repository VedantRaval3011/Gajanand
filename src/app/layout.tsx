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
    icon: [
      { url: "/ganpati.jpg", type: "image/x-icon" }, // Favicon
      { url: "/ganpati.jpg", type: "image/jpeg", sizes: "512x512" }, // App Icon
    ],
    apple: "/ganpati.jpg", // Apple Touch Icon
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