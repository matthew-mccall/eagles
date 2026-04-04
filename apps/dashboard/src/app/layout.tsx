import './global.css';

export const metadata = {
  title: 'Hazard Watch — Gas Detection Dashboard',
  description: 'Real-time gas hazard detection and mapping for industrial job sites',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white text-gray-900 dark:bg-gray-950 dark:text-white transition-colors">
        {children}
      </body>
    </html>
  );
}
