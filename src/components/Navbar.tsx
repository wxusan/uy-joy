import { getTranslations, getLocale } from "next-intl/server";
import NavbarClient from "./NavbarClient";
import { getCurrentTenant } from "@/lib/tenant";

export default async function Navbar() {
  const t = await getTranslations("common");
  const locale = await getLocale();
  const tenant = await getCurrentTenant();

  return (
    <NavbarClient
      currentLocale={locale}
      phoneNumber={tenant?.phoneNumber ?? null}
      labels={{
        residence: t("residence"),
        apartments: t("apartments"),
        location: t("location"),
        aboutUyjoy: t("aboutUyjoy"),
        contacts: t("contacts"),
        contactSales: t("contactSales"),
      }}
    />
  );
}
