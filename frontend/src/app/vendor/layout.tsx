import { VendorAuthProvider } from "../../lib/vendor-auth";

export default function VendorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VendorAuthProvider>
      {children}
    </VendorAuthProvider>
  );
}
