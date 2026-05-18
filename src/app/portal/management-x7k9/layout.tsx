import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </NextIntlClientProvider>
  );
}
