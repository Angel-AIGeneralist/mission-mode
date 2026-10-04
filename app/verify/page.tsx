import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VerifyForm } from "./verify-form";

export default function VerifyPage() {
  const phone = cookies().get("mm-otp-phone")?.value;
  if (!phone) {
    redirect("/login");
  }

  return <VerifyForm phone={phone} />;
}
