import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";

const ubuntu = Ubuntu({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300","400","500","700"]
});


export const metadata: Metadata = {
  title: "Gajanad",
  description: "This is a finance software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` ${ubuntu.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
