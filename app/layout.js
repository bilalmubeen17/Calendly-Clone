import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "SchedLink",
  description: "Book time straight off a real Google Calendar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <Image
              src="/simplibill-logo.png"
              alt="SimpliBill"
              width={220}
              height={66}
              priority
            />
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
