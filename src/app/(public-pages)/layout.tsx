import { ReactNode } from "react";

/**
 * Layout cho các trang công khai (không cần authentication)
 * VD: Login, Register, Home page
 */
export default function PublicPagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

