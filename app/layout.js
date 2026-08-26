import "./globals.css";

export const metadata = {
  title: "SchedLink",
  description: "Book time straight off a real Google Calendar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
